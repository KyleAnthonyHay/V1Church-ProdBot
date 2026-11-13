/**
 * Text out of an uploaded .txt or .pdf. Node-only (unpdf), so only call this
 * from a "use node" action; the dynamic import keeps it out of V8 bundles.
 */
export async function extractTextFromBlob(
  blob: Blob,
  kind: "txt" | "pdf",
): Promise<string> {
  let text: string;
  if (kind === "pdf") {
    const { extractText: extractPdf, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    const result = await extractPdf(pdf, { mergePages: true });
    text = result.text;
  } else {
    text = await blob.text();
  }
  if (!text.trim())
    throw new Error(
      "No text could be extracted (scanned PDF? try pasting the text instead)",
    );
  return text;
}
