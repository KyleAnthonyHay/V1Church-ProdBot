"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { extractTextFromBlob } from "./lib/extractText";

/** Pull text out of an uploaded .txt or .pdf and store it on the source row. */
export const extractText = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.runQuery(internal.sources.getInternal, {
      id: sourceId,
    });
    if (!source?.storageId || source.kind === "paste") return;
    try {
      const blob = await ctx.storage.get(source.storageId);
      if (!blob) throw new Error("Uploaded file not found in storage");
      const text = await extractTextFromBlob(blob, source.kind);
      await ctx.runMutation(internal.sources.setText, {
        id: sourceId,
        text,
        status: "ready",
      });
    } catch (e) {
      await ctx.runMutation(internal.sources.setText, {
        id: sourceId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
});
