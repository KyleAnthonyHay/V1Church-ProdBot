import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const docKindValidator = v.union(
  v.literal("wiring"),
  v.literal("pitfalls"),
  v.literal("runbook"),
  v.literal("systems"),
  v.literal("links"),
  v.literal("glossary"),
);

export const sourceKindValidator = v.union(
  v.literal("paste"),
  v.literal("txt"),
  v.literal("pdf"),
);

// Which admin category a note was added under. Generation still reads every
// ready note for the campus; the topic only organises the admin view.
export const sourceTopicValidator = v.union(
  v.literal("wiring"),
  v.literal("pitfalls"),
);

export default defineSchema({
  campuses: defineTable({
    slug: v.string(),
    name: v.string(),
    order: v.number(),
  }).index("by_slug", ["slug"]),

  // Raw material admins add: pasted text, .txt, .pdf. campusId undefined = shared.
  sources: defineTable({
    campusId: v.optional(v.id("campuses")),
    title: v.string(),
    kind: sourceKindValidator,
    topic: v.optional(sourceTopicValidator),
    storageId: v.optional(v.id("_storage")),
    text: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_campus", ["campusId"]),

  // Structured docs the agent reads. One row per (campus, kind). campusId undefined = shared.
  documents: defineTable({
    campusId: v.optional(v.id("campuses")),
    kind: docKindValidator,
    content: v.string(),
    draft: v.optional(v.string()),
    draftNotes: v.optional(v.string()),
    draftSourceIds: v.optional(v.array(v.id("sources"))),
    draftSourceTitles: v.optional(v.array(v.string())),
    draftWiringYaml: v.optional(v.string()),
    draftBaseContent: v.optional(v.string()),
    draftCreatedAt: v.optional(v.number()),
    generating: v.optional(v.boolean()),
    generateError: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_campus_kind", ["campusId", "kind"]),

  revisions: defineTable({
    documentId: v.id("documents"),
    content: v.string(),
    note: v.string(),
    savedAt: v.number(),
  }).index("by_document", ["documentId"]),

  conversations: defineTable({
    campusId: v.id("campuses"),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_campus", ["campusId"]),

  // Describe-and-draw chats in the wiring workspace. Several per campus; the
  // canvas holds the drawing, so these only keep the conversation. Bounded.
  wiringChats: defineTable({
    campusId: v.optional(v.id("campuses")),
    title: v.string(),
    turns: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        text: v.string(),
        error: v.optional(v.boolean()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campus_updated", ["campusId", "updatedAt"]),

  checklist: defineTable({
    campusId: v.id("campuses"),
    date: v.string(),
    runbookContent: v.string(),
    stepNumber: v.string(),
    checked: v.boolean(),
  }).index("by_campus_date", ["campusId", "date"]),

  fixProposals: defineTable({
    campusId: v.id("campuses"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    pitfallId: v.string(),
    note: v.string(),
    evidence: v.string(),
    date: v.string(),
    createdAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_campus_status", ["campusId", "status"])
    .index("by_message", ["messageId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    // Streamed reasoning summary from the model (assistant messages only).
    reasoning: v.optional(v.string()),
    status: v.union(
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error"),
    ),
    createdAt: v.number(),
    // When an assistant answer finished (shown as "Worked for Ns").
    finishedAt: v.optional(v.number()),
  }).index("by_conversation", ["conversationId"]),
});
