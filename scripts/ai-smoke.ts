import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { readFileSync, writeFileSync } from "node:fs";
import { parsePitfalls, validatePitfallRefs } from "../shared/docs";
import { parseWiringYaml } from "../shared/wiring";
if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Development only");
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
if (!(await client.query(api.admin.config, {})).aiConfigured)
  throw new Error("Set OPENAI_API_KEY first");
const campus = (await client.query(api.campuses.list, {})).find(
  (c) => c.slug === "brooklyn",
)!;
const created = JSON.parse(
  readFileSync(".verification/preview-docs.json", "utf8"),
) as { id: Id<"documents">; content: string }[];
const existing = await client.query(api.documents.listForCampus, {
  campusId: campus._id,
});
if (
  existing.length !== created.length ||
  existing.some(
    (d) => created.find((c) => c.id === d._id)?.content !== d.content,
  )
)
  throw new Error("Documents changed outside verification; stopping");
const text = readFileSync("tests/fixtures/rig.txt", "utf8");
const sourceId = await client.mutation(api.sources.createPaste, {
  campusId: campus._id,
  title: "VERIFICATION FIXTURE - fictional rig",
  text,
});
writeFileSync(".verification/ai-source.json", JSON.stringify({ sourceId }));
await client.action(api.ai.generateAll, { campusId: campus._id });
let docs = await client.query(api.documents.listForCampus, {
  campusId: campus._id,
});
for (const doc of docs) {
  if (!doc.draft?.trim())
    throw new Error(`Missing ${doc.kind} draft: ${doc.generateError}`);
  if (!doc.draftSourceIds?.includes(sourceId))
    throw new Error(`Missing ${doc.kind} source attribution`);
}
const wiring = docs.find((d) => d.kind === "wiring")!;
const parsed = parseWiringYaml(wiring.draft!);
if (!parsed.graph || parsed.issues.length)
  throw new Error(`Invalid graph: ${parsed.issues.join("; ")}`);
const pitfalls = docs.find((d) => d.kind === "pitfalls")!;
const refs = validatePitfallRefs(
  parsePitfalls(pitfalls.draft!),
  new Set(parsed.graph.nodes.map((n) => n.id)),
);
if (refs.length) throw new Error(refs.join("; "));
console.log(
  `PASS generateAll: 4 attributed drafts, ${parsed.graph.nodes.length} devices, nullable structured output parsed, pitfall refs valid`,
);
// Leave drafts intact for browser review. Approval is a separate verification step.
const conversationId = await client.mutation(api.chat.createConversation, {
  campusId: campus._id,
});
writeFileSync(
  ".verification/ai-conversation.json",
  JSON.stringify({ conversationId }),
);
for (const content of [
  "Verification: the drummer has no click. Walk the documented chain and cite device and pitfall ids.",
  "Summarize those same checks in three short steps.",
]) {
  const assistantId = await client.mutation(api.chat.send, {
    conversationId,
    content,
  });
  let done = false;
  let sawPartial = false;
  for (let i = 0; i < 180; i++) {
    const messages = await client.query(api.chat.listMessages, {
      conversationId,
    });
    const answer = messages.find((m) => m._id === assistantId);
    if (answer?.status === "streaming" && answer.content) sawPartial = true;
    if (answer?.status === "error") throw new Error(answer.content);
    if (answer?.status === "done") {
      if (!answer.content.trim()) throw new Error("Blank answer");
      console.log(
        `PASS live chat: done, ${answer.content.length} characters, partial observed=${sawPartial}`,
      );
      done = true;
      break;
    }
    await Bun.sleep(500);
  }
  if (!done) throw new Error("Chat timed out");
}
