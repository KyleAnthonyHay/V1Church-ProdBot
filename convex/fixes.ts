import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { parsePitfalls, recordPitfallFix } from "../shared/docs";

export const propose = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    pitfallId: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const convo = await ctx.db.get(args.conversationId);
    const message = await ctx.db.get(args.messageId);
    if (!convo || !message || message.conversationId !== convo._id)
      throw new Error("Conversation removed");
    if (
      !/^P-\d+$/.test(args.pitfallId) ||
      !args.note.trim() ||
      args.note.length > 2000
    )
      throw new Error("Invalid fix proposal");
    const report = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
      .filter((q) =>
        q.and(
          q.lt(q.field("_creationTime"), message._creationTime),
          q.eq(q.field("role"), "user"),
        ),
      )
      .order("desc")
      .first();
    if (
      !report ||
      !new RegExp(`\\b${args.pitfallId}\\b`).test(report.content)
    ) {
      throw new Error(
        "Name the pitfall id in your fix report so it can be attached to the review.",
      );
    }
    const pitfalls = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) =>
        q.eq("campusId", convo.campusId).eq("kind", "pitfalls"),
      )
      .unique();
    if (
      !parsePitfalls(pitfalls?.content ?? "").some(
        (p) => p.id === args.pitfallId,
      )
    )
      throw new Error("Unknown pitfall");
    const existing = await ctx.db
      .query("fixProposals")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    if (existing.some((p) => p.pitfallId === args.pitfallId)) return;
    await ctx.db.insert("fixProposals", {
      ...args,
      evidence: report.content,
      campusId: convo.campusId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      status: "pending",
    });
  },
});

export const list = query({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, { campusId }) => {
    return ctx.db
      .query("fixProposals")
      .withIndex("by_campus_status", (q) =>
        q.eq("campusId", campusId).eq("status", "pending"),
      )
      .collect();
  },
});

export const review = mutation({
  args: { id: v.id("fixProposals"), approve: v.boolean() },
  handler: async (ctx, { id, approve }) => {
    const proposal = await ctx.db.get(id);
    if (!proposal || proposal.status !== "pending")
      throw new Error("Proposal already reviewed");
    if (approve) {
      const doc = await ctx.db
        .query("documents")
        .withIndex("by_campus_kind", (q) =>
          q.eq("campusId", proposal.campusId).eq("kind", "pitfalls"),
        )
        .unique();
      if (!doc) throw new Error("Pitfalls document removed");
      const content = recordPitfallFix(
        doc.content,
        proposal.pitfallId,
        proposal.date,
        proposal.note,
      );
      await ctx.db.insert("revisions", {
        documentId: doc._id,
        content: doc.content,
        note: `Before approving fix for ${proposal.pitfallId}`,
        savedAt: Date.now(),
      });
      await ctx.db.patch(doc._id, { content, updatedAt: Date.now() });
    }
    await ctx.db.patch(id, {
      status: approve ? "approved" : "rejected",
      reviewedBy: "admin",
      reviewedAt: Date.now(),
    });
  },
});
