/** Explicit development-only verification. Removes only fixtures it creates. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { readFileSync } from "node:fs";
const url = process.env.VITE_CONVEX_URL;
if (!url || !process.env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Smoke checks require a configured development deployment");
const client = new ConvexHttpClient(url);
await client.mutation(api.campuses.ensureDefaults, {});
const campuses = await client.query(api.campuses.list, {});
if (campuses.length !== 5) throw new Error("Expected five campuses");
const campusId = campuses.find((c) => c.slug === "brooklyn")!._id;
const created: Id<"sources">[] = [];
const prefix = `Verification ${Date.now()}`;
function pdf(text: string) {
  const stream = text ? `BT /F1 12 Tf 50 700 Td (${text}) Tj ET` : "";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}
async function waitSource(id: Id<"sources">) {
  for (let i = 0; i < 60; i++) {
    const source = (await client.query(api.sources.list, { campusId })).find(
      (s) => s._id === id,
    );
    if (source && source.status !== "pending") return source;
    await Bun.sleep(500);
  }
  throw new Error("Extraction timed out");
}
try {
  const text = readFileSync(
    new URL("../tests/fixtures/rig.txt", import.meta.url),
    "utf8",
  );
  const paste = await client.mutation(api.sources.createPaste, {
    campusId,
    title: `${prefix} paste`,
    text,
  });
  created.push(paste);
  if ((await client.query(api.sources.getText, { id: paste })) !== text)
    throw new Error("Paste text mismatch");
  console.log("PASS pasted source round trip");
  for (const [name, kind, blob, expected] of [
    ["text.txt", "txt", new Blob([text], { type: "text/plain" }), "ready"],
    [
      "text.pdf",
      "pdf",
      pdf("Verification fixture: playback Mac to stage box A."),
      "ready",
    ],
    ["no-text.pdf", "pdf", pdf(""), "error"],
  ] as const) {
    const uploadUrl = await client.mutation(api.sources.generateUploadUrl, {});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    const id = await client.mutation(api.sources.createUpload, {
      campusId,
      title: `${prefix} ${name}`,
      kind,
      storageId,
    });
    created.push(id);
    const source = await waitSource(id);
    if (source.status !== expected)
      throw new Error(`${name}: ${source.status}: ${source.error ?? ""}`);
    const extracted = await client.query(api.sources.getText, { id });
    if (
      expected === "ready" &&
      !extracted.includes("Verification") &&
      !extracted.includes("VERIFICATION")
    )
      throw new Error(`${name}: missing extracted text`);
    if (expected === "error" && !source.error?.includes("No text"))
      throw new Error("Missing readable extraction error");
    console.log(`PASS ${name}: ${source.status}`);
  }
} finally {
  for (const id of created) await client.mutation(api.sources.remove, { id });
  console.log(
    `Removed ${created.length} verification sources and associated uploads`,
  );
}
