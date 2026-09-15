import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync } from "node:fs";
if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Development only");
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
const campus = (await client.query(api.campuses.list, {})).find(
  (c) => c.slug === "brooklyn",
)!;
const expected = JSON.parse(
  readFileSync(".verification/preview-docs.json", "utf8"),
) as { id: string; content: string }[];
const { sourceId } = JSON.parse(
  readFileSync(".verification/ai-source.json", "utf8"),
);
const docs = await client.query(api.documents.listForCampus, {
  campusId: campus._id,
});
const sources = await client.query(api.sources.list, { campusId: campus._id });
if (
  docs.length !== expected.length ||
  docs.some((d) => expected.find((e) => e.id === d._id)?.content !== d.content)
)
  throw new Error(
    "Documents changed outside verification; will not clear campus",
  );
if (sources.length !== 1 || sources[0]?._id !== sourceId)
  throw new Error(
    "Sources changed outside verification; will not clear campus",
  );
await client.mutation(api.documents.clearCampus, {
  campusId: campus._id,
  confirmation: campus.name,
});
const { conversationId } = JSON.parse(
  readFileSync(".verification/ai-conversation.json", "utf8"),
);
await client.mutation(api.chat.removeConversation, { id: conversationId });
const conversations = await client.query(api.chat.listConversations, {
  campusId: campus._id,
});
for (const conversation of conversations) {
  if (
    [
      "Verification: what is documented for this campus?",
      "Verification OpenAI: what is documented for this campus?",
    ].includes(conversation.title)
  ) {
    await client.mutation(api.chat.removeConversation, {
      id: conversation._id,
    });
  }
}
console.log(
  "Removed fictional documents, drafts, revisions, uploads, checklist state, fix proposals and verification chats from development",
);
