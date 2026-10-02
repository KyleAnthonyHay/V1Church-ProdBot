import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import {
  DEMO_CAMPUSES,
  DEMO_CHATS,
  DEMO_CHURCH,
  DEMO_DRAFT,
  DEMO_EMAIL,
  DEMO_FIX,
  DEMO_PASSWORD,
  DEMO_SHARED,
} from "./demoData";

/**
 * Create the demo account if needed and put the demo church back to its
 * starting state. Runs nightly (crons.ts) and by hand:
 *   bunx convex run demo:seed
 */
export const seed = internalAction({
  args: {},
  handler: async (ctx): Promise<{ orgId: Id<"organizations"> }> => {
    let userId: Id<"users">;
    try {
      const { user } = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: DEMO_EMAIL },
      });
      userId = user._id;
    } catch {
      const { user } = await createAccount(ctx, {
        provider: "password",
        account: { id: DEMO_EMAIL, secret: DEMO_PASSWORD },
        profile: { email: DEMO_EMAIL, name: "Demo volunteer" },
      });
      userId = user._id;
    }
    return await ctx.runMutation(internal.demo.reset, { userId });
  },
});

export const reset = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    let orgId = membership?.orgId;
    if (orgId && !(await ctx.db.get(orgId))?.demo)
      throw new Error("The demo account belongs to a real church; refusing.");
    if (!orgId) {
      orgId = await ctx.db.insert("organizations", {
        name: DEMO_CHURCH,
        demo: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("memberships", { userId, orgId, role: "owner" });
    }
    await clearOrg(ctx, orgId);
    await fill(ctx, orgId);
    return { orgId };
  },
});

async function clearOrg(ctx: MutationCtx, orgId: Id<"organizations">) {
  const campuses = await ctx.db
    .query("campuses")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  for (const campus of campuses) {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_campus", (q) => q.eq("campusId", campus._id))
      .collect();
    for (const c of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .collect();
      for (const m of messages) await ctx.db.delete(m._id);
      await ctx.db.delete(c._id);
    }
    for (const table of ["checklist", "fixProposals"] as const) {
      const rows = await ctx.db
        .query(table)
        .filter((q) => q.eq(q.field("campusId"), campus._id))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
    await ctx.db.delete(campus._id);
  }
  const docs = await ctx.db
    .query("documents")
    .withIndex("by_org_campus_kind", (q) => q.eq("orgId", orgId))
    .collect();
  for (const doc of docs) {
    const revisions = await ctx.db
      .query("revisions")
      .withIndex("by_document", (q) => q.eq("documentId", doc._id))
      .collect();
    for (const r of revisions) await ctx.db.delete(r._id);
    await ctx.db.delete(doc._id);
  }
  const sources = await ctx.db
    .query("sources")
    .withIndex("by_org_campus", (q) => q.eq("orgId", orgId))
    .collect();
  for (const s of sources) {
    if (s.storageId) await ctx.storage.delete(s.storageId);
    await ctx.db.delete(s._id);
  }
  const chats = await ctx.db
    .query("wiringChats")
    .withIndex("by_org_campus_updated", (q) => q.eq("orgId", orgId))
    .collect();
  for (const c of chats) await ctx.db.delete(c._id);
}

async function fill(ctx: MutationCtx, orgId: Id<"organizations">) {
  const now = Date.now();
  const day = 86_400_000;
  const campusIds = new Map<string, Id<"campuses">>();
  const docIds = new Map<string, Id<"documents">>();

  for (const [order, campus] of DEMO_CAMPUSES.entries()) {
    const campusId = await ctx.db.insert("campuses", {
      orgId,
      name: campus.name,
      slug: campus.slug,
      order,
    });
    campusIds.set(campus.name, campusId);
    for (const doc of campus.docs) {
      const id = await ctx.db.insert("documents", {
        orgId,
        campusId,
        kind: doc.kind,
        content: doc.content,
        updatedAt: now - 3 * day,
      });
      docIds.set(`${campus.name}:${doc.kind}`, id);
    }
  }
  for (const doc of DEMO_SHARED)
    await ctx.db.insert("documents", {
      orgId,
      kind: doc.kind,
      content: doc.content,
      updatedAt: now - 10 * day,
    });

  // An earlier wiring revision, so History has something in it.
  const downtownWiring = docIds.get("Downtown:wiring")!;
  const wiringDoc = (await ctx.db.get(downtownWiring))!;
  await ctx.db.insert("revisions", {
    documentId: downtownWiring,
    content: wiringDoc.content.replace(
      /\n  - from: foh_console\n    to: broadcast_mac[\s\S]*$/,
      "\n",
    ),
    note: "Before adding the broadcast Mac",
    savedAt: now - 9 * day,
  });

  // Booth notes and a pitfalls draft waiting for approval.
  const draftCampus = campusIds.get(DEMO_DRAFT.campus)!;
  const sourceId = await ctx.db.insert("sources", {
    orgId,
    campusId: draftCampus,
    title: DEMO_DRAFT.sourceTitle,
    kind: "paste",
    topic: "pitfalls",
    text: DEMO_DRAFT.sourceText,
    status: "ready",
    createdAt: now - 4 * day,
  });
  const pitfallsId = docIds.get(`${DEMO_DRAFT.campus}:pitfalls`)!;
  const pitfalls = (await ctx.db.get(pitfallsId))!;
  const wiring = (await ctx.db.get(
    docIds.get(`${DEMO_DRAFT.campus}:wiring`)!,
  ))!;
  await ctx.db.patch(pitfallsId, {
    draft: pitfalls.content.trimEnd() + "\n" + DEMO_DRAFT.addition,
    draftNotes: DEMO_DRAFT.notes,
    draftSourceIds: [sourceId],
    draftSourceTitles: [DEMO_DRAFT.sourceTitle],
    draftWiringYaml: wiring.content,
    draftBaseContent: pitfalls.content,
    draftCreatedAt: now - 4 * day,
  });

  // Chats, oldest first so the newest sits on top of the sidebar.
  for (const [i, chat] of DEMO_CHATS.entries()) {
    const campusId = campusIds.get(chat.campus)!;
    const start = now - (DEMO_CHATS.length - i) * 3_600_000;
    const conversationId = await ctx.db.insert("conversations", {
      campusId,
      title: chat.turns[0]!.content.slice(0, 60),
      createdAt: start,
    });
    for (const [k, turn] of chat.turns.entries())
      await ctx.db.insert("messages", {
        conversationId,
        role: turn.role,
        content: turn.content,
        ...(turn.reasoning ? { reasoning: turn.reasoning } : {}),
        status: "done",
        createdAt: start + k * 6_000,
        ...(turn.role === "assistant"
          ? { finishedAt: start + k * 6_000 + 7_000 }
          : {}),
      });
  }

  // A volunteer's fix report waiting in Admin's review queue.
  const fixCampus = campusIds.get(DEMO_FIX.campus)!;
  const fixStart = now - 20 * 60_000;
  const fixConversation = await ctx.db.insert("conversations", {
    campusId: fixCampus,
    title: "P-001 happened again at 9am",
    createdAt: fixStart,
  });
  await ctx.db.insert("messages", {
    conversationId: fixConversation,
    role: "user",
    content: DEMO_FIX.user,
    status: "done",
    createdAt: fixStart,
  });
  const reply = await ctx.db.insert("messages", {
    conversationId: fixConversation,
    role: "assistant",
    content: DEMO_FIX.assistant,
    status: "done",
    createdAt: fixStart + 1,
    finishedAt: fixStart + 4_000,
  });
  await ctx.db.insert("fixProposals", {
    campusId: fixCampus,
    conversationId: fixConversation,
    messageId: reply,
    pitfallId: DEMO_FIX.pitfallId,
    note: DEMO_FIX.note,
    evidence: DEMO_FIX.user,
    date: new Date(fixStart).toISOString().slice(0, 10),
    createdAt: fixStart,
    status: "pending",
  });

  // Today's Downtown checklist, first three steps done.
  const runbook = (await ctx.db.get(docIds.get("Downtown:runbook")!))!;
  const today = new Date(now).toISOString().slice(0, 10);
  for (const stepNumber of ["1", "2", "3"])
    await ctx.db.insert("checklist", {
      campusId: campusIds.get("Downtown")!,
      date: today,
      runbookContent: runbook.content,
      stepNumber,
      checked: true,
    });

  // A finished describe-and-draw chat in the wiring workspace.
  await ctx.db.insert("wiringChats", {
    orgId,
    campusId: campusIds.get("Downtown")!,
    title: "Add the broadcast Mac",
    turns: [
      {
        role: "user",
        text: "The broadcast Mac in the booth now gets its mix from the LV1 over SoundGrid.",
      },
      {
        role: "assistant",
        text: "Added Broadcast mix Mac in the broadcast group, fed from the FOH console over SoundGrid (Cat 6).",
      },
    ],
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
  });
}
