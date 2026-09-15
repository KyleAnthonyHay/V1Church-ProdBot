import { mutation, query } from "./_generated/server";

const DEFAULTS: [string, string][] = [
  ["brooklyn", "Brooklyn"],
  ["long-island", "Long Island"],
  ["manhattan", "Manhattan"],
  ["miami", "Miami"],
  ["indiana", "Indiana"],
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("campuses").collect();
    return all.sort((a, b) => a.order - b.order);
  },
});

/** Idempotent. The client calls this on load so the five campuses exist. */
export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    let i = 0;
    for (const [slug, name] of DEFAULTS) {
      const existing = await ctx.db
        .query("campuses")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!existing) await ctx.db.insert("campuses", { slug, name, order: i });
      i++;
    }
  },
});
