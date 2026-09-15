import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { parseWiringYaml } from "../shared/wiring";
import { validateImport } from "../shared/backup";
import { docKindValidator } from "./schema";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function findDoc(
  ctx: QueryCtx | MutationCtx,
  campusId: Id<"campuses"> | undefined,
  kind: string,
) {
  return await ctx.db
    .query("documents")
    .withIndex("by_campus_kind", (q) =>
      q.eq("campusId", campusId).eq("kind", kind as never),
    )
    .unique();
}

export const listForCampus = query({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    const rows = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) => q.eq("campusId", campusId))
      .collect();
    return rows;
  },
});

export const save = mutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    content: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { campusId, kind, content, note }) => {
    if (kind === "wiring" && content.trim()) {
      const parsed = parseWiringYaml(content);
      if (!parsed.graph || parsed.issues.length)
        throw new Error(`Invalid wiring: ${parsed.issues.join("; ")}`);
    }
    const existing = await findDoc(ctx, campusId, kind);
    const now = Date.now();
    if (!existing) {
      return await ctx.db.insert("documents", {
        campusId,
        kind,
        content,
        updatedAt: now,
      });
    }
    if (existing.content !== content) {
      if (existing.content.trim()) {
        await ctx.db.insert("revisions", {
          documentId: existing._id,
          content: existing.content,
          note: note?.trim() || "Manual edit",
          savedAt: now,
        });
      }
      await ctx.db.patch(existing._id, { content, updatedAt: now });
    }
    return existing._id;
  },
});

export const approveDraft = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.draft === undefined) throw new Error("No draft to approve");
    if (doc.generating) throw new Error("Wait for generation to finish");
    if (
      doc.draftBaseContent !== undefined &&
      doc.content !== doc.draftBaseContent
    )
      throw new Error(
        "The approved document changed after this draft was created. Regenerate or load the draft into the editor to reconcile it.",
      );
    if (doc.kind === "wiring") {
      const parsed = parseWiringYaml(doc.draft);
      if (!parsed.graph || parsed.issues.length)
        throw new Error(`Invalid wiring: ${parsed.issues.join("; ")}`);
    }
    if (doc.draftWiringYaml !== undefined) {
      const wiring = await findDoc(ctx, doc.campusId, "wiring");
      if ((wiring?.content ?? "") !== doc.draftWiringYaml)
        throw new Error(
          "Approve the wiring used by this draft first, or regenerate against the current wiring.",
        );
    }
    const now = Date.now();
    if (doc.content.trim()) {
      await ctx.db.insert("revisions", {
        documentId: id,
        content: doc.content,
        note: "Before AI draft approval",
        savedAt: now,
      });
    }
    await ctx.db.patch(id, {
      content: doc.draft,
      draft: undefined,
      draftNotes: undefined,
      draftCreatedAt: undefined,
      draftSourceIds: undefined,
      draftSourceTitles: undefined,
      draftWiringYaml: undefined,
      draftBaseContent: undefined,
      updatedAt: now,
    });
  },
});

export const discardDraft = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    if ((await ctx.db.get(id))?.generating)
      throw new Error("Wait for generation to finish");
    await ctx.db.patch(id, {
      draft: undefined,
      draftNotes: undefined,
      draftCreatedAt: undefined,
      draftSourceIds: undefined,
      draftSourceTitles: undefined,
      draftWiringYaml: undefined,
      draftBaseContent: undefined,
      generateError: undefined,
    });
  },
});

export const revisions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return ctx.db
      .query("revisions")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .take(20);
  },
});

export const restoreRevision = mutation({
  args: { revisionId: v.id("revisions") },
  handler: async (ctx, { revisionId }) => {
    const rev = await ctx.db.get(revisionId);
    if (!rev) throw new Error("Revision not found");
    const doc = await ctx.db.get(rev.documentId);
    if (!doc) throw new Error("Document not found");
    const now = Date.now();
    await ctx.db.insert("revisions", {
      documentId: doc._id,
      content: doc.content,
      note: "Before restore",
      savedAt: now,
    });
    await ctx.db.patch(doc._id, { content: rev.content, updatedAt: now });
  },
});

// ---- internal, used by the AI actions ----

export const setGenerating = internalMutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    generating: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { campusId, kind, generating, error }) => {
    const existing = await findDoc(ctx, campusId, kind);
    if (generating && existing?.generating)
      throw new Error("This document is already generating");
    if (existing) {
      await ctx.db.patch(existing._id, { generating, generateError: error });
    } else {
      await ctx.db.insert("documents", {
        campusId,
        kind,
        content: "",
        generating,
        generateError: error,
        updatedAt: Date.now(),
      });
    }
  },
});

export const setDraft = internalMutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    draft: v.string(),
    draftNotes: v.optional(v.string()),
    draftSourceIds: v.optional(v.array(v.id("sources"))),
    draftSourceTitles: v.optional(v.array(v.string())),
    draftWiringYaml: v.optional(v.string()),
    draftBaseContent: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      campusId,
      kind,
      draft,
      draftNotes,
      draftSourceIds,
      draftSourceTitles,
      draftWiringYaml,
      draftBaseContent,
    },
  ) => {
    const existing = await findDoc(ctx, campusId, kind);
    const patch = {
      draft,
      draftNotes,
      draftSourceIds,
      draftSourceTitles,
      draftWiringYaml,
      draftBaseContent: draftBaseContent ?? existing?.content ?? "",
      draftCreatedAt: Date.now(),
      generating: false,
      generateError: undefined,
    };
    if (existing) await ctx.db.patch(existing._id, patch);
    else
      await ctx.db.insert("documents", {
        campusId,
        kind,
        content: "",
        updatedAt: Date.now(),
        ...patch,
      });
  },
});

export const contextForGeneration = internalQuery({
  args: {
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    useDraftWiring: v.optional(v.boolean()),
  },
  handler: async (ctx, { campusId, kind, useDraftWiring }) => {
    const campus = campusId ? await ctx.db.get(campusId) : null;
    const doc = await findDoc(ctx, campusId, kind);
    const wiring = campusId ? await findDoc(ctx, campusId, "wiring") : null;
    return {
      campusName: campus?.name ?? null,
      current: doc?.content ?? "",
      wiringYaml:
        (useDraftWiring
          ? (wiring?.draft ?? wiring?.content)
          : wiring?.content) ?? "",
    };
  },
});

export const contextForConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) throw new Error("Conversation not found");
    const campus = await ctx.db.get(convo.campusId);
    if (!campus) throw new Error("Campus not found");
    const campusDocs = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) => q.eq("campusId", convo.campusId))
      .collect();
    const sharedDocs = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) => q.eq("campusId", undefined))
      .collect();
    const pick = (d: { kind: string; content: string }) => ({
      kind: d.kind,
      content: d.content,
    });
    return {
      campusName: campus.name,
      campusDocs: campusDocs.map(pick),
      sharedDocs: sharedDocs.map(pick),
    };
  },
});

export const importFiles = mutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    files: v.array(v.object({ kind: docKindValidator, content: v.string() })),
  },
  handler: async (ctx, { campusId, files }) => {
    validateImport(files, campusId === undefined);
    if (campusId && !(await ctx.db.get(campusId)))
      throw new Error("Campus not found");
    // One transaction: all files become reviewable drafts, none are published.
    for (const file of files) {
      const existing = await findDoc(ctx, campusId, file.kind);
      if (existing?.generating || existing?.draft !== undefined)
        throw new Error(
          `Review or discard the existing ${file.kind} draft first`,
        );
      const patch = {
        draft: file.content,
        draftNotes: "Imported from a local file. Review before approving.",
        draftCreatedAt: Date.now(),
        draftSourceIds: [],
        draftSourceTitles: [],
        draftBaseContent: existing?.content ?? "",
      };
      if (existing) await ctx.db.patch(existing._id, patch);
      else
        await ctx.db.insert("documents", {
          campusId,
          kind: file.kind,
          content: "",
          updatedAt: Date.now(),
          ...patch,
        });
    }
  },
});

async function deleteDoc(ctx: MutationCtx, id: Id<"documents">) {
  const doc = await ctx.db.get(id);
  if (doc?.generating)
    throw new Error("Wait for generation to finish before deleting");
  if (doc?.kind === "runbook" && doc.campusId) {
    const checks = await ctx.db
      .query("checklist")
      .withIndex("by_campus_date", (q) => q.eq("campusId", doc.campusId!))
      .collect();
    for (const check of checks) await ctx.db.delete(check._id);
  }
  const revisions = await ctx.db
    .query("revisions")
    .withIndex("by_document", (q) => q.eq("documentId", id))
    .collect();
  for (const revision of revisions) await ctx.db.delete(revision._id);
  await ctx.db.delete(id);
}
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await deleteDoc(ctx, id);
  },
});

export const clearCampus = mutation({
  args: { campusId: v.id("campuses"), confirmation: v.string() },
  handler: async (ctx, { campusId, confirmation }) => {
    const campus = await ctx.db.get(campusId);
    if (!campus || confirmation !== campus.name)
      throw new Error("Enter the campus name to confirm");
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) => q.eq("campusId", campusId))
      .collect();
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_campus", (q) => q.eq("campusId", campusId))
      .collect();
    if (sources.some((s) => s.status === "pending"))
      throw new Error("Wait for source extraction to finish before clearing");
    for (const doc of docs) await deleteDoc(ctx, doc._id);
    for (const source of sources) {
      if (source.storageId) await ctx.storage.delete(source.storageId);
      await ctx.db.delete(source._id);
    }
    const checks = await ctx.db
      .query("checklist")
      .withIndex("by_campus_date", (q) => q.eq("campusId", campusId))
      .collect();
    for (const check of checks) await ctx.db.delete(check._id);
    const proposals = await ctx.db
      .query("fixProposals")
      .withIndex("by_campus_status", (q) => q.eq("campusId", campusId))
      .collect();
    for (const proposal of proposals) await ctx.db.delete(proposal._id);
    // Keep the campus selector entry and conversations. "Clear" is
    // explicitly described in the UI as clearing documentation and sources.
  },
});
