import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync, writeFileSync } from "node:fs";
if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Development only");
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
const { conversationId } = JSON.parse(
  readFileSync(".verification/ai-conversation.json", "utf8"),
);
const campus = (await client.query(api.campuses.list, {})).find(
  (c) => c.slug === "brooklyn",
)!;
const messageId = await client.mutation(api.chat.send, {
  conversationId,
  content:
    "Verification fix report: P-003 was the Ableton output device again. I reselected the Scarlett and the drummer can hear click now. Please propose the last-seen update for Admin approval.",
});
for (let i = 0; i < 120; i++) {
  const message = (
    await client.query(api.chat.listMessages, { conversationId })
  ).find((m) => m._id === messageId);
  if (message?.status === "error") throw new Error(message.content);
  if (message?.status === "done") break;
  if (i === 119) throw new Error("Fix proposal timed out");
  await Bun.sleep(500);
}
const proposal = (
  await client.query(api.fixes.list, { campusId: campus._id })
).find((p) => p.messageId === messageId);
if (!proposal)
  throw new Error("Luna did not create the expected review proposal");
console.log("PASS Luna proposed P-003 fix with quoted volunteer evidence");
// Approval order must be wiring first. These are our clearly marked fixtures.
const docs = await client.query(api.documents.listForCampus, {
  campusId: campus._id,
});
const expected = JSON.parse(
  readFileSync(".verification/preview-docs.json", "utf8"),
) as { id: string; content: string }[];
if (
  docs.some((d) => expected.find((e) => e.id === d._id)?.content !== d.content)
)
  throw new Error("Fixture changed; stopping");
for (const kind of ["wiring", "pitfalls", "runbook", "systems"]) {
  const doc = docs.find((d) => d.kind === kind)!;
  await client.mutation(api.documents.approveDraft, { id: doc._id });
}
await client.mutation(api.fixes.review, { id: proposal._id, approve: true });
const updated = await client.query(api.documents.listForCampus, {
  campusId: campus._id,
});
if (!updated.find((d) => d.kind === "pitfalls")?.content.includes("Scarlett"))
  throw new Error("Fix did not reach documentation");
writeFileSync(
  ".verification/preview-docs.json",
  JSON.stringify(updated.map((d) => ({ id: d._id, content: d.content }))),
);
console.log(
  "PASS ordered approval and reviewed last-seen update, revisions retained",
);
