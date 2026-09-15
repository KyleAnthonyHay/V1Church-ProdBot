import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const rows = await ctx.db
      .query("wiringChats")
      .withIndex("by_campus_updated", (q) => q.eq("campusId", campusId))
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
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    if (campusId && !(await ctx.db.get(campusId)))
      throw new Error("Campus not found");
    const now = Date.now();
    return ctx.db.insert("wiringChats", {
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
    if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});
