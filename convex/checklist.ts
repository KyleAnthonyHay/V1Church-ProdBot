import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { parseRunbookSteps } from "../shared/docs";
import { scope } from "./lib/access";

export const list = query({
  args: { campusId: v.id("campuses"), date: v.string() },
  handler: async (ctx, { campusId, date }) => {
    await scope(ctx, campusId);
    return ctx.db
      .query("checklist")
      .withIndex("by_campus_date", (q) =>
        q.eq("campusId", campusId).eq("date", date),
      )
      .collect();
  },
});

export const set = mutation({
  args: {
    campusId: v.id("campuses"),
    date: v.string(),
    runbookContent: v.string(),
    stepNumber: v.string(),
    checked: v.boolean(),
  },
  handler: async (ctx, args) => {
    await scope(ctx, args.campusId);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(args.date) ||
      new Date(args.date).toISOString().slice(0, 10) !== args.date
    )
      throw new Error("Invalid date");
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_campus_kind", (q) =>
        q.eq("campusId", args.campusId).eq("kind", "runbook"),
      )
      .unique();
    if (!doc || doc.content !== args.runbookContent)
      throw new Error("Runbook changed. Refresh before checking this step.");
    if (
      !parseRunbookSteps(doc.content).some((s) => s.number === args.stepNumber)
    )
      throw new Error("Step not found");
    const rows = await ctx.db
      .query("checklist")
      .withIndex("by_campus_date", (q) =>
        q.eq("campusId", args.campusId).eq("date", args.date),
      )
      .collect();
    const row = rows.find((r) => r.stepNumber === args.stepNumber);
    if (row) await ctx.db.patch(row._id, args);
    else await ctx.db.insert("checklist", args);
  },
});
