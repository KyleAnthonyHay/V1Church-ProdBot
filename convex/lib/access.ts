import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/**
 * Every church is an organization. A signed-in user belongs to one; all
 * campuses and documents are scoped to it. Rows with campusId undefined are
 * that organization's shared docs (links, glossary).
 */
export async function viewer(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to continue.");
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!membership) throw new ConvexError("Set up your church first.");
  return { userId, orgId: membership.orgId };
}

/** The viewer's org, checked against a campus when one is given. */
export async function scope(ctx: Ctx, campusId: Id<"campuses"> | undefined) {
  const v = await viewer(ctx);
  if (campusId === undefined) return { ...v, campus: null };
  const campus = await ctx.db.get(campusId);
  if (!campus || campus.orgId !== v.orgId)
    throw new ConvexError("Campus not found");
  return { ...v, campus };
}

/** Throws unless a row (by its campus or org) belongs to the viewer's org. */
export async function assertOwns(
  ctx: Ctx,
  row: { campusId?: Id<"campuses">; orgId?: Id<"organizations"> } | null,
  what = "Item",
): Promise<{ userId: Id<"users">; orgId: Id<"organizations"> }> {
  const v = await viewer(ctx);
  if (!row) throw new ConvexError(`${what} not found`);
  const orgId = row.orgId ?? (await orgOfCampus(ctx, row.campusId));
  if (orgId !== v.orgId) throw new ConvexError(`${what} not found`);
  return v;
}

export async function orgOfCampus(
  ctx: Ctx,
  campusId: Id<"campuses"> | undefined,
) {
  if (!campusId) return undefined;
  return (await ctx.db.get(campusId))?.orgId;
}

export async function conversationFor(ctx: Ctx, id: Id<"conversations">) {
  const conversation: Doc<"conversations"> | null = await ctx.db.get(id);
  await assertOwns(ctx, conversation, "Conversation");
  return conversation!;
}
