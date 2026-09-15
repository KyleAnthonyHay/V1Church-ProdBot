"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/** Pull text out of an uploaded .txt or .pdf and store it on the source row. */
export const extractText = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.runQuery(internal.sources.getInternal, {
      id: sourceId,
    });
    if (!source?.storageId) return;
    try {
      const blob = await ctx.storage.get(source.storageId);
      if (!blob) throw new Error("Uploaded file not found in storage");
      let text: string;
      if (source.kind === "pdf") {
        const { extractText: extractPdf, getDocumentProxy } =
          await import("unpdf");
        const pdf = await getDocumentProxy(
          new Uint8Array(await blob.arrayBuffer()),
        );
        const result = await extractPdf(pdf, { mergePages: true });
        text = result.text;
      } else {
        text = await blob.text();
      }
      if (!text.trim())
        throw new Error(
          "No text could be extracted (scanned PDF? try pasting the text instead)",
        );
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
