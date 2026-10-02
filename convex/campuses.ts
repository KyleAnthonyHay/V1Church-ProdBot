import { query } from "./_generated/server";
import { viewer } from "./lib/access";

/** The signed-in church's campuses, in order. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await viewer(ctx);
    return ctx.db
      .query("campuses")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
  },
});
