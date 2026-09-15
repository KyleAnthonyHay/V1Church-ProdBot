"use node";
import OpenAI from "openai";
import type { Response } from "openai/resources/responses/responses";
import { zodTextFormat } from "openai/helpers/zod";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { docKindValidator } from "./schema";
import { buildAgentSystemPrompt, buildGenerationPrompt } from "./lib/prompt";
import {
  aiWiringSchema,
  normalizeAiGraph,
  validateGraph,
  wiringToYaml,
} from "../shared/wiring";
import { assertContextBudget } from "../shared/history";
import { stripCodeFence, type DocKind } from "../shared/docs";

type Effort = "none" | "low" | "medium" | "high" | "xhigh" | "max";
const MODEL = process.env.AGENT_MODEL ?? "gpt-5.6-luna";
function effort(name: string, fallback: Effort): Effort {
  const value = process.env[name] ?? fallback;
  if (!["none", "low", "medium", "high", "xhigh", "max"].includes(value))
    throw new Error(`Invalid ${name}`);
  return value as Effort;
}
function client() {
  if (!process.env.OPENAI_API_KEY)
    throw new Error(
      "OPENAI_API_KEY is not set on the Convex deployment. Add it in deployment Settings → Environment Variables.",
    );
  return new OpenAI({ timeout: 180_000, maxRetries: 1 });
}
function describeError(e: unknown): string {
  if (e instanceof OpenAI.AuthenticationError)
    return "OPENAI_API_KEY is invalid on the Convex deployment.";
  if (e instanceof OpenAI.RateLimitError)
    return "OpenAI rate or quota limit reached. Check API billing and try again shortly.";
  if (e instanceof OpenAI.APIError)
    return `OpenAI request failed (${e.status ?? "network"}, ${e.code ?? "API error"}). Check the configured model and deployment logs.`;
  return e instanceof Error ? e.message : String(e);
}
function requireCompleted(response: Response) {
  if (response.status !== "completed")
    throw new Error(
      `Generation did not complete (${response.incomplete_details?.reason ?? response.error?.code ?? response.status}). Try a smaller request.`,
    );
  if (
    response.output.some(
      (item) =>
        item.type === "message" &&
        item.content.some((c) => c.type === "refusal"),
    )
  )
    throw new Error("The model declined this request.");
}
function logUsage(response: Response, operation: string) {
  console.info("openai_usage", {
    operation,
    model: response.model,
    cachedTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  });
}

/** Streams the assistant's answer into the message row so the UI updates live. */
export const answer = internalAction({
  args: {
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
  },
  handler: async (ctx, { conversationId, assistantMessageId }) => {
    let text = "";
    let lastFlush = 0;
    const flush = (status: "streaming" | "done" | "error") =>
      ctx.runMutation(internal.chat.updateAssistant, {
        id: assistantMessageId,
        content: text,
        status,
      });

    try {
      const context = await ctx.runQuery(
        internal.documents.contextForConversation,
        { conversationId },
      );
      const history = await ctx.runQuery(internal.chat.history, {
        conversationId,
        excludeId: assistantMessageId,
      });
      if (
        history.length === 0 ||
        history[history.length - 1]!.role !== "user"
      ) {
        throw new Error("No user message to answer");
      }
      const system = buildAgentSystemPrompt(
        context.campusName,
        context.campusDocs as { kind: DocKind; content: string }[],
        context.sharedDocs as { kind: DocKind; content: string }[],
      );

      assertContextBudget(system, history);
      const stream = client().responses.stream({
        model: MODEL,
        max_output_tokens: 8000,
        store: false,
        reasoning: { effort: effort("AGENT_EFFORT", "medium") },
        instructions: system,
        input: history.map((m) => ({ role: m.role, content: m.content })),
        tools: [
          {
            type: "function",
            name: "propose_pitfall_fix",
            description:
              "Only when the latest volunteer message explicitly names a documented pitfall id and reports resolving it, propose a last-seen update for admin review. The server attaches the original message as evidence. Never claim approval.",
            strict: true,
            parameters: {
              type: "object",
              properties: {
                pitfallId: { type: "string" },
                note: { type: "string" },
              },
              required: ["pitfallId", "note"],
              additionalProperties: false,
            },
          },
        ],
      });
      for await (const event of stream) {
        if (
          event.type === "response.output_text.delta" ||
          event.type === "response.refusal.delta"
        ) {
          text += event.delta;
          if (Date.now() - lastFlush > 250) {
            lastFlush = Date.now();
            await flush("streaming");
          }
        }
      }
      const final = await stream.finalResponse();
      requireCompleted(final);
      logUsage(final, "chat");
      for (const block of final.output) {
        if (
          block.type !== "function_call" ||
          block.name !== "propose_pitfall_fix"
        )
          continue;
        const input = JSON.parse(block.arguments) as Record<string, unknown>;
        if (
          typeof input.pitfallId !== "string" ||
          typeof input.note !== "string"
        )
          throw new Error("Invalid fix proposal from model");
        await ctx.runMutation(internal.fixes.propose, {
          conversationId,
          messageId: assistantMessageId,
          pitfallId: input.pitfallId,
          note: input.note,
        });
        text += `\n\nFix for **${input.pitfallId}** submitted for admin review. The documentation has not changed yet.`;
      }
      if (!text.trim()) text = "_No answer was produced. Try rephrasing._";
      await flush("done");
    } catch (e) {
      text += `${text ? "\n\n" : ""}**Error:** ${describeError(e)}`;
      await flush("error");
    }
  },
});

/** Admin: turn the campus's source material into a draft of one document. */
export const generateDocument = action({
  args: {
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    instructions: v.optional(v.string()),
    useDraftWiring: v.optional(v.boolean()),
  },
  handler: async (ctx, { campusId, kind, instructions, useDraftWiring }) => {
    await ctx.runMutation(internal.documents.setGenerating, {
      campusId,
      kind,
      generating: true,
    });
    try {
      const sources = await ctx.runQuery(internal.sources.readyForCampus, {
        campusId,
      });
      const context = await ctx.runQuery(
        internal.documents.contextForGeneration,
        { campusId, kind, useDraftWiring },
      );
      if (
        sources.length === 0 &&
        !context.current.trim() &&
        !instructions?.trim()
      ) {
        throw new Error(
          "Add at least one source (paste, .txt, or .pdf) before generating.",
        );
      }
      const totalChars = sources.reduce((n, s) => n + s.text.length, 0);
      if (totalChars > 800_000) {
        throw new Error(
          "Source material is very large (over 800k characters). Remove or split some sources.",
        );
      }
      const { system, user } = buildGenerationPrompt({
        kind: kind as DocKind,
        campusName: context.campusName,
        sources,
        current: context.current,
        wiringYaml:
          kind === "pitfalls" || kind === "runbook"
            ? context.wiringYaml
            : undefined,
        instructions,
      });

      assertContextBudget(system, user);
      const openai = client();
      let draft: string;
      let notes: string | undefined;

      if (kind === "wiring") {
        const response = await openai.responses.parse({
          model: MODEL,
          max_output_tokens: 32000,
          store: false,
          reasoning: { effort: effort("GENERATE_EFFORT", "high") },
          instructions: system,
          input: [{ role: "user", content: user }],
          text: { format: zodTextFormat(aiWiringSchema, "wiring_graph") },
        });
        requireCompleted(response);
        logUsage(response, "generate_wiring");
        if (!response.output_parsed)
          throw new Error(
            "The model did not return a valid wiring graph. Try again.",
          );
        const graph = normalizeAiGraph(response.output_parsed);
        const issues = validateGraph(graph);
        draft = wiringToYaml(
          graph,
          `${context.campusName ?? "Shared"} wiring graph. Generated ${new Date().toISOString().slice(0, 10)} from ${sources.length} source(s).`,
        );
        const noteLines = [
          ...response.output_parsed.assumptions.map((a) => `- ${a}`),
          ...issues.map((i) => `- VALIDATION: ${i}`),
        ];
        notes = noteLines.length ? noteLines.join("\n") : undefined;
      } else {
        const stream = openai.responses.stream({
          model: MODEL,
          max_output_tokens: 32000,
          store: false,
          reasoning: { effort: effort("GENERATE_EFFORT", "high") },
          instructions: system,
          input: [{ role: "user", content: user }],
        });
        const final = await stream.finalResponse();
        requireCompleted(final);
        logUsage(final, `generate_${kind}`);
        draft = stripCodeFence(final.output_text);
        if (!draft.trim())
          throw new Error("The model returned an empty document.");
      }

      await ctx.runMutation(internal.documents.setDraft, {
        campusId,
        kind,
        draft,
        draftNotes: notes,
        draftBaseContent: context.current,
        draftSourceIds: sources.map((s) => s.id),
        draftSourceTitles: sources.map((s) => s.title),
        draftWiringYaml:
          kind === "pitfalls" || kind === "runbook"
            ? context.wiringYaml
            : undefined,
      });
    } catch (e) {
      await ctx.runMutation(internal.documents.setGenerating, {
        campusId,
        kind,
        generating: false,
        error: describeError(e),
      });
      throw e;
    }
  },
});

/** Sequential so dependent drafts use the newly generated wiring, without publishing it. */
export const generateAll = action({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, { campusId }): Promise<void> => {
    for (const kind of ["wiring", "pitfalls", "runbook", "systems"] as const) {
      await ctx.runAction(api.ai.generateDocument, {
        campusId,
        kind,
        useDraftWiring: true,
      });
    }
  },
});
