import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { budgetHistory } from "../shared/history";

export async function getConversation(ctx: QueryCtx, id: Id<"conversations">) {
  const conversation = await ctx.db.get(id);
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

export const listConversations = query({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, { campusId }) => {
    return ctx.db
      .query("conversations")
      .withIndex("by_campus", (q) => q.eq("campusId", campusId))
      .order("desc")
      .take(50);
  },
});

export const createConversation = mutation({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, { campusId }) => {
    if (!(await ctx.db.get(campusId))) throw new Error("Campus not found");
    return ctx.db.insert("conversations", {
      campusId,
      title: "New conversation",
      createdAt: Date.now(),
    });
  },
});

export const removeConversation = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, { id }) => {
    await getConversation(ctx, id);
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", id))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(id);
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    if (!(await ctx.db.get(conversationId))) return [];
    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, { conversationId, content }) => {
    const text = content.trim();
    if (!text) throw new Error("Empty message");
    if (text.length > 12_000)
      throw new Error("Message is too long (maximum 12,000 characters)");
    const convo = await getConversation(ctx, conversationId);
    if (!convo) throw new Error("Conversation not found");
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc")
      .take(1);
    if (recent[0]?.status === "streaming")
      throw new Error("Wait for the current answer to finish");
    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content: text,
      status: "done",
      createdAt: now,
    });
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId,
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: now + 1,
    });
    if (convo.title === "New conversation") {
      await ctx.db.patch(conversationId, {
        title: text.length > 60 ? text.slice(0, 57) + "..." : text,
      });
    }
    await ctx.scheduler.runAfter(0, internal.ai.answer, {
      conversationId,
      assistantMessageId,
    });
    return assistantMessageId;
  },
});

export const history = internalQuery({
  args: { conversationId: v.id("conversations"), excludeId: v.id("messages") },
  handler: async (ctx, { conversationId, excludeId }) => {
    const target = await ctx.db.get(excludeId);
    if (!target) return [];
    const all = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.lt(q.field("_creationTime"), target._creationTime))
      .order("desc")
      .take(60);
    return budgetHistory(
      all
        .reverse()
        .filter((m) => m.status === "done" && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content })),
    );
  },
});

export const updateAssistant = internalMutation({
  args: {
    id: v.id("messages"),
    content: v.string(),
    status: v.union(
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, { id, content, status }) => {
    if (await ctx.db.get(id)) await ctx.db.patch(id, { content, status });
  },
});
