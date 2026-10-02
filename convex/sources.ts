import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { sourceKindValidator, sourceTopicValidator } from "./schema";
import { assertOwns, scope, viewer } from "./lib/access";

export const list = query({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    const { orgId } = await scope(ctx, campusId);
    const rows = await ctx.db
      .query("sources")
      .withIndex("by_org_campus", (q) =>
        q.eq("orgId", orgId).eq("campusId", campusId),
      )
      .order("desc")
      .collect();
    // Don't ship full text to the list view.
    return rows.map(({ text, ...r }) => ({
      ...r,
      charCount: text?.length ?? 0,
    }));
  },
});

export const getText = query({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return "";
    await assertOwns(ctx, row, "Source");
    return row.text ?? "";
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx, {}) => {
    await viewer(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPaste = mutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    title: v.string(),
    text: v.string(),
    topic: v.optional(sourceTopicValidator),
  },
  handler: async (ctx, { campusId, title, text, topic }) => {
    if (!text.trim()) throw new Error("Nothing to add");
    const { orgId } = await scope(ctx, campusId);
    return await ctx.db.insert("sources", {
      orgId,
      campusId,
      title: title.trim() || `Pasted note ${new Date().toLocaleDateString()}`,
      kind: "paste",
      topic,
      text,
      status: "ready",
      createdAt: Date.now(),
    });
  },
});

export const createUpload = mutation({
  args: {
    campusId: v.optional(v.id("campuses")),
    title: v.string(),
    kind: sourceKindValidator,
    storageId: v.id("_storage"),
    topic: v.optional(sourceTopicValidator),
  },
  handler: async (ctx, { campusId, title, kind, storageId, topic }) => {
    const { orgId } = await scope(ctx, campusId);
    const id = await ctx.db.insert("sources", {
      orgId,
      campusId,
      title,
      kind,
      topic,
      storageId,
      status: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.extract.extractText, {
      sourceId: id,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return;
    await assertOwns(ctx, row, "Source");
    if (row.storageId) await ctx.storage.delete(row.storageId);
    await ctx.db.delete(id);
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const readyForCampus = internalQuery({
  args: {
    orgId: v.id("organizations"),
    campusId: v.optional(v.id("campuses")),
  },
  handler: async (ctx, { orgId, campusId }) => {
    const rows = await ctx.db
      .query("sources")
      .withIndex("by_org_campus", (q) =>
        q.eq("orgId", orgId).eq("campusId", campusId),
      )
      .order("asc")
      .collect();
    return rows
      .filter((r) => r.status === "ready" && r.text)
      .map((r) => ({ id: r._id, title: r.title, text: r.text! }));
  },
});

export const setText = internalMutation({
  args: {
    id: v.id("sources"),
    text: v.optional(v.string()),
    status: v.union(v.literal("ready"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, text, status, error }) => {
    if (await ctx.db.get(id)) await ctx.db.patch(id, { text, status, error });
  },
});
