import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertOwns, scope } from "./lib/access";

/** Oldest turns are dropped past this, so a long chat stays small. */
const MAX_TURNS = 100;
const NEW_TITLE = "New chat";

const turnValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  text: v.string(),
  error: v.optional(v.boolean()),
});

/** Chats for a campus (undefined = shared), most recently used first. */
export const list = query({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    const { orgId } = await scope(ctx, campusId);
    const rows = await ctx.db
      .query("wiringChats")
      .withIndex("by_org_campus_updated", (q) =>
        q.eq("orgId", orgId).eq("campusId", campusId),
      )
      .order("desc")
      .take(50);
    return rows.map((c) => ({
      _id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      turnCount: c.turns.length,
    }));
  },
});

export const get = query({
  args: { id: v.id("wiringChats") },
  handler: async (ctx, { id }) => {
    const chat = await ctx.db.get(id);
    if (!chat) return null;
    await assertOwns(ctx, chat, "Chat");
    return chat;
  },
});

export const create = mutation({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    const { orgId } = await scope(ctx, campusId);
    const now = Date.now();
    return ctx.db.insert("wiringChats", {
      orgId,
      campusId,
      title: NEW_TITLE,
      turns: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Add turns to a chat; the first message names it. */
export const append = mutation({
  args: { id: v.id("wiringChats"), turns: v.array(turnValidator) },
  handler: async (ctx, { id, turns }) => {
    const chat = await ctx.db.get(id);
    await assertOwns(ctx, chat, "Chat");
    if (!chat) throw new Error("Chat not found");
    const firstUser = turns.find((t) => t.role === "user")?.text.trim();
    const title =
      chat.title === NEW_TITLE && firstUser
        ? firstUser.length > 48
          ? `${firstUser.slice(0, 47).trimEnd()}…`
          : firstUser
        : chat.title;
    await ctx.db.patch(id, {
      title,
      turns: [...chat.turns, ...turns].slice(-MAX_TURNS),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("wiringChats") },
  handler: async (ctx, { id }) => {
    const chat = await ctx.db.get(id);
    if (!chat) return;
    await assertOwns(ctx, chat, "Chat");
    await ctx.db.delete(id);
  },
});
