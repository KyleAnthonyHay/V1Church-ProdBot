import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = {
  "../convex/ai.ts": () => import("../convex/ai"),
  "../convex/sources.ts": () => import("../convex/sources"),
  "../convex/_generated/server.js": () =>
    import("../convex/_generated/server.js"),
  "../convex/campuses.ts": () => import("../convex/campuses"),
  "../convex/documents.ts": () => import("../convex/documents"),
  "../convex/checklist.ts": () => import("../convex/checklist"),
  "../convex/chat.ts": () => import("../convex/chat"),
  "../convex/fixes.ts": () => import("../convex/fixes"),
};
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(api.campuses.ensureDefaults, {});
  const campuses = await t.query(api.campuses.list, {});
  return { t, campusId: campuses[0]!._id };
}
test("campus defaults are idempotent, documents preserve revisions", async () => {
  const { t, campusId } = await setup();
  await t.mutation(api.campuses.ensureDefaults, {});
  expect(await t.query(api.campuses.list, {})).toHaveLength(5);
  const id = await t.mutation(api.documents.save, {
    campusId,
    kind: "systems",
    content: "original",
  });
  await t.mutation(internal.documents.setDraft, {
    campusId,
    kind: "systems",
    draft: "new",
    draftSourceIds: [],
    draftSourceTitles: [],
  });
  await t.mutation(api.documents.approveDraft, { id });
  const [doc] = await t.query(api.documents.listForCampus, { campusId });
  expect(doc?.content).toBe("new");
  expect(doc?.draftSourceIds).toBeUndefined();
  const [rev] = await t.query(api.documents.revisions, { documentId: id });
  expect(rev?.content).toBe("original");
  await t.mutation(api.documents.restoreRevision, { revisionId: rev!._id });
  expect(
    (await t.query(api.documents.listForCampus, { campusId }))[0]?.content,
  ).toBe("original");
});
test("dependent drafts cannot be approved against different wiring", async () => {
  const { t, campusId } = await setup();
  const id = await t.mutation(api.documents.save, {
    campusId,
    kind: "pitfalls",
    content: "old",
  });
  await t.mutation(internal.documents.setDraft, {
    campusId,
    kind: "pitfalls",
    draft: "new",
    draftWiringYaml: "new wiring",
  });
  await expect(t.mutation(api.documents.approveDraft, { id })).rejects.toThrow(
    "Approve the wiring",
  );
});
test("import is atomic and keeps approved content until review", async () => {
  const { t, campusId } = await setup();
  const id = await t.mutation(api.documents.save, {
    campusId,
    kind: "systems",
    content: "original",
  });
  await t.mutation(api.documents.importFiles, {
    campusId,
    files: [{ kind: "systems", content: "imported" }],
  });
  const [doc] = await t.query(api.documents.listForCampus, { campusId });
  expect(doc?.content).toBe("original");
  expect(doc?.draft).toBe("imported");
  await expect(
    t.mutation(api.documents.importFiles, {
      campusId,
      files: [
        { kind: "runbook", content: "new" },
        { kind: "systems", content: "overwrite" },
      ],
    }),
  ).rejects.toThrow("existing systems draft");
  expect(await t.query(api.documents.listForCampus, { campusId })).toHaveLength(
    1,
  );
  await t.mutation(api.documents.remove, { id });
  expect(await t.query(api.documents.listForCampus, { campusId })).toHaveLength(
    0,
  );
});
test("checklists are date scoped and reject stale runbooks", async () => {
  const { t, campusId } = await setup();
  const content = "| 1 | 6:30 | Lead | Power on | Link lights | P-001 |";
  await t.mutation(api.documents.save, { campusId, kind: "runbook", content });
  const args = {
    campusId,
    date: "2026-09-20",
    runbookContent: content,
    stepNumber: "1",
    checked: true,
  };
  await t.mutation(api.checklist.set, args);
  expect(
    (await t.query(api.checklist.list, { campusId, date: args.date }))[0]
      ?.checked,
  ).toBe(true);
  expect(
    await t.query(api.checklist.list, { campusId, date: "2026-09-27" }),
  ).toHaveLength(0);
  await t.mutation(api.documents.save, {
    campusId,
    kind: "runbook",
    content: content + "\nChanged",
  });
  await expect(t.mutation(api.checklist.set, args)).rejects.toThrow(
    "Runbook changed",
  );
});
test("fix review requires evidence and preserves revision before approval", async () => {
  const { t, campusId } = await setup();
  const content =
    "## P-003: No click\n- nodes: [playback]\n- last seen: unknown\n";
  await t.mutation(api.documents.save, { campusId, kind: "pitfalls", content });
  const conversationId = await t.mutation(api.chat.createConversation, {
    campusId,
  });
  const evidence = "P-003 was the Ableton output device again";
  const messageId = await t.run(async (ctx) => {
    await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content: evidence,
      status: "done",
      createdAt: Date.now(),
    });
    return ctx.db.insert("messages", {
      conversationId,
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: Date.now(),
    });
  });
  await expect(
    t.mutation(internal.fixes.propose, {
      conversationId,
      messageId,
      pitfallId: "P-999",
      note: "Guessed",
    }),
  ).rejects.toThrow("Name the pitfall");
  await t.mutation(internal.fixes.propose, {
    conversationId,
    messageId,
    pitfallId: "P-003",
    note: "Ableton output device",
  });
  expect(
    (await t.query(api.documents.listForCampus, { campusId }))[0]?.content,
  ).toBe(content);
  const [proposal] = await t.query(api.fixes.list, { campusId });
  expect(proposal?.evidence).toBe(evidence);
  await t.mutation(api.fixes.review, { id: proposal!._id, approve: true });
  expect(
    (await t.query(api.documents.listForCampus, { campusId }))[0]?.content,
  ).toContain("Ableton output device");
  await expect(
    t.mutation(api.fixes.review, { id: proposal!._id, approve: true }),
  ).rejects.toThrow("already reviewed");
});

test("approval refuses stale drafts and generation excludes a concurrent writer", async () => {
  const { t, campusId } = await setup();
  const id = await t.mutation(api.documents.save, {
    campusId,
    kind: "systems",
    content: "v1",
  });
  await t.mutation(internal.documents.setDraft, {
    campusId,
    kind: "systems",
    draft: "AI draft",
    draftBaseContent: "v1",
  });
  await t.mutation(api.documents.save, {
    campusId,
    kind: "systems",
    content: "v2",
  });
  await expect(t.mutation(api.documents.approveDraft, { id })).rejects.toThrow(
    "changed after",
  );
  await t.mutation(internal.documents.setGenerating, {
    campusId,
    kind: "systems",
    generating: true,
  });
  await expect(
    t.mutation(internal.documents.setGenerating, {
      campusId,
      kind: "systems",
      generating: true,
    }),
  ).rejects.toThrow("already generating");
  await expect(t.mutation(api.documents.remove, { id })).rejects.toThrow(
    "generation",
  );
});

test("missing OpenAI key ends the assistant row with a readable error", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const { t, campusId } = await setup();
    const conversationId = await t.mutation(api.chat.createConversation, {
      campusId,
    });
    const assistantMessageId = await t.run(async (ctx) => {
      await ctx.db.insert("messages", {
        conversationId,
        role: "user",
        content: "What is documented?",
        status: "done",
        createdAt: Date.now(),
      });
      return ctx.db.insert("messages", {
        conversationId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: Date.now() + 1,
      });
    });
    await t.action(internal.ai.answer, { conversationId, assistantMessageId });
    const messages = await t.query(api.chat.listMessages, { conversationId });
    expect(messages[1]?.status).toBe("error");
    expect(messages[1]?.content).toContain("OPENAI_API_KEY is not set");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
