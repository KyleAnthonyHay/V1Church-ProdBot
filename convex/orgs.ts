import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { scope, viewer } from "./lib/access";

/** The signed-in user and their church; null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const org = membership ? await ctx.db.get(membership.orgId) : null;
    return {
      userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      org: org ? { _id: org._id, name: org.name, demo: !!org.demo } : null,
    };
  },
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "campus"
  );
}

/** First sign-in: create the church and its first campuses. */
export const createChurch = mutation({
  args: { name: v.string(), campuses: v.array(v.string()) },
  handler: async (ctx, { name, campuses }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to continue.");
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) throw new ConvexError("You already belong to a church.");
    const churchName = name.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!churchName) throw new ConvexError("Name your church.");
    const names = [
      ...new Set(
        campuses.map((c) => c.replace(/\s+/g, " ").trim().slice(0, 60)),
      ),
    ].filter(Boolean);
    if (names.length === 0) throw new ConvexError("Add at least one campus.");
    if (names.length > 20) throw new ConvexError("Up to 20 campuses.");
    const orgId = await ctx.db.insert("organizations", {
      name: churchName,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberships", { userId, orgId, role: "owner" });
    for (const [order, campus] of names.entries())
      await ctx.db.insert("campuses", {
        orgId,
        name: campus,
        slug: slugify(campus),
        order,
      });
    return orgId;
  },
});

/** Add a campus to the viewer's church. */
export const addCampus = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const { orgId } = await viewer(ctx);
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!clean) throw new ConvexError("Name the campus.");
    const existing = await ctx.db
      .query("campuses")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    if (existing.some((c) => c.name.toLowerCase() === clean.toLowerCase()))
      throw new ConvexError("That campus already exists.");
    return ctx.db.insert("campuses", {
      orgId,
      name: clean,
      slug: slugify(clean),
      order: existing.length,
    });
  },
});

/**
 * One-off migration for data created before sign-in existed: move every
 * row without an org into a church called `name`, and make the account
 * with `email` (if given and signed up) its owner.
 *   bunx convex run orgs:claimLegacy '{"name":"V1 Church","email":"you@example.com"}'
 */
export const claimLegacy = internalMutation({
  args: { name: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, { name, email }) => {
    let org = (await ctx.db.query("organizations").collect()).find(
      (o) => o.name === name && !o.demo,
    );
    const orgId =
      org?._id ??
      (await ctx.db.insert("organizations", { name, createdAt: Date.now() }));
    const moved: Record<string, number> = {};
    for (const table of [
      "campuses",
      "documents",
      "sources",
      "wiringChats",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      let n = 0;
      for (const row of rows)
        if (!row.orgId) {
          await ctx.db.patch(row._id, { orgId });
          n++;
        }
      moved[table] = n;
    }
    let member: string | null = null;
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
        .first();
      if (!user)
        throw new ConvexError(`No account for ${email}; sign up first.`);
      const has = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (has && has.orgId !== orgId)
        throw new ConvexError(`${email} already belongs to another church.`);
      if (!has)
        await ctx.db.insert("memberships", {
          userId: user._id,
          orgId,
          role: "owner",
        });
      member = email;
    }
    org = (await ctx.db.get(orgId))!;
    return { orgId, org: org.name, moved, member };
  },
});

/** For actions: the signed-in church, checked against a campus. */
export const scopeFor = internalQuery({
  args: { campusId: v.optional(v.id("campuses")) },
  handler: async (ctx, { campusId }) => {
    const { orgId } = await scope(ctx, campusId);
    return { orgId };
  },
});
