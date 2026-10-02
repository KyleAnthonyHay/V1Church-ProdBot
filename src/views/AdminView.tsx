import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import type { Campus } from "@/App";
import {
  DOC_META,
  parsePitfallDetails,
  parseRunbookSteps,
  type DocKind,
} from "@shared/docs";
import { parseWiringYaml } from "@shared/wiring";
import { DocumentCard } from "@/admin/DocumentCard";
import { NotesBox } from "@/admin/NotesBox";
import { LinksCard } from "@/admin/LinksCard";
import { TerminologyCard } from "@/admin/TerminologyCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

type Tab =
  | "overview"
  | "wiring"
  | "pitfalls"
  | "runbook"
  | "systems"
  | "links"
  | "terminology";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "wiring", label: "Wiring" },
  { id: "pitfalls", label: "Pitfalls" },
  { id: "runbook", label: "Runbook" },
  { id: "systems", label: "Systems" },
  { id: "links", label: "Links" },
  { id: "terminology", label: "Terminology" },
];

/** Which tab edits each document kind. */
const TAB_FOR: Record<DocKind, Tab> = {
  wiring: "wiring",
  pitfalls: "pitfalls",
  runbook: "runbook",
  systems: "systems",
  links: "links",
  glossary: "terminology",
};

type DocRow = Doc<"documents">;

export function AdminView({ campus }: { campus: Campus }) {
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const shared = useQuery(api.documents.listForCampus, {});
  const sources = useQuery(api.sources.list, { campusId: campus._id });
  const fixes = useQuery(api.fixes.list, { campusId: campus._id });
  const byKind = useMemo(
    () => new Map((docs ?? []).map((d) => [d.kind as DocKind, d])),
    [docs],
  );
  const hasSources =
    (sources?.filter((s) => s.status === "ready").length ?? 0) > 0;
  const [tab, setTab] = useState<Tab>("overview");

  if (docs === undefined) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-border bg-background/90 sticky top-0 z-10 border-b px-4 backdrop-blur md:px-8">
        <div
          role="tablist"
          aria-label="Admin sections"
          className="-mb-px flex gap-6 overflow-x-auto"
        >
          {TABS.map((t) => {
            const on = t.id === tab;
            const waiting =
              t.id === "overview"
                ? docs.filter((d) => d.draft !== undefined).length +
                  (fixes?.length ?? 0)
                : 0;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors",
                  on
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {t.label}
                {waiting > 0 && (
                  <span className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] tabular-nums">
                    {waiting}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full px-4 py-6 pb-16 md:px-8">
        {tab === "overview" && (
          <Overview
            campus={campus}
            docs={docs}
            shared={shared ?? []}
            fixes={fixes ?? []}
            onOpen={setTab}
          />
        )}
        {tab === "wiring" && (
          <DocumentCard
            bare
            kind="wiring"
            campusId={campus._id}
            doc={byKind.get("wiring")}
            allDocs={byKind}
            hasSources={hasSources}
            title="Wiring diagram"
            description="Open the diagram to describe what plugs into what; the AI draws it and you can adjust any device by hand. Volunteers see it under Explore and the agent walks it when troubleshooting."
          />
        )}
        {tab === "pitfalls" && (
          <DocumentCard
            bare
            kind="pitfalls"
            campusId={campus._id}
            doc={byKind.get("pitfalls")}
            allDocs={byKind}
            hasSources={hasSources}
            title="Common pitfalls"
            description="Things that go wrong on Sundays and how they were fixed. The AI writes them up symptom-first and ties each one to the wiring. Drafts stay drafts until you approve them."
            notes={
              <NotesBox
                campusId={campus._id}
                topic="pitfalls"
                placeholder={`Example:\n\nWhen the drummer loses click but still hears the band, it has always been the Ableton output routing after a session file swap. Check out 3 on the Clarett first, then the IEM aux send on the LV1...`}
              />
            }
          />
        )}
        {(tab === "runbook" || tab === "systems") && (
          <DocumentCard
            key={tab}
            bare
            kind={tab}
            campusId={campus._id}
            doc={byKind.get(tab)}
            allDocs={byKind}
            hasSources={hasSources}
          />
        )}
        {tab === "links" && <LinksCard bare />}
        {tab === "terminology" && <TerminologyCard bare />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({
  campus,
  docs,
  shared,
  fixes,
  onOpen,
}: {
  campus: Campus;
  docs: DocRow[];
  shared: DocRow[];
  fixes: Doc<"fixProposals">[];
  onOpen: (tab: Tab) => void;
}) {
  const find = (kind: DocKind) =>
    (kind === "links" || kind === "glossary" ? shared : docs).find(
      (d) => d.kind === kind,
    );
  const wiring = useMemo(
    () => parseWiringYaml(find("wiring")?.content ?? "").graph,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs],
  );
  const pitfalls = useMemo(
    () => parsePitfallDetails(find("pitfalls")?.content ?? "").pitfalls,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs],
  );
  const steps = useMemo(
    () => parseRunbookSteps(find("runbook")?.content ?? ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs],
  );
  const drafts = [...docs, ...shared].filter((d) => d.draft !== undefined);

  const stats = [
    { label: "Devices", value: wiring?.nodes.length ?? 0, tab: "wiring" },
    {
      label: "Connections",
      value: wiring?.edges.length ?? 0,
      tab: "wiring",
    },
    { label: "Pitfalls", value: pitfalls.length, tab: "pitfalls" },
    { label: "Runbook steps", value: steps.length, tab: "runbook" },
    {
      label: "Waiting for review",
      value: drafts.length + fixes.length,
      tab: "overview",
    },
  ] as const;

  const starts: { tab: Tab; title: string; body: string }[] = [
    {
      tab: "wiring",
      title: "Draw the wiring",
      body: "Describe what plugs into what and the AI draws it.",
    },
    {
      tab: "pitfalls",
      title: "Add a pitfall",
      body: "Write down a Sunday problem and how it was fixed.",
    },
    {
      tab: "runbook",
      title: "Write the runbook",
      body: "Setup order, owners, and what done looks like.",
    },
    {
      tab: "links",
      title: "Add a link",
      body: "Manuals and vendor pages every campus shares.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <div className="text-muted-foreground text-xs font-medium">
          {campus.name}
        </div>
        <h2 className="text-2xl font-medium tracking-[-0.03em]">
          Documentation overview
        </h2>
      </header>

      {/* Quick starts */}
      <div className="border-border bg-card grid overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-4">
        {starts.map((s, i) => (
          <button
            key={s.tab}
            onClick={() => onOpen(s.tab)}
            className={cn(
              "group hover:bg-muted/50 border-border p-5 text-left transition-colors",
              i > 0 && "border-t sm:border-t-0",
              i % 2 === 1 && "sm:border-l",
              i >= 2 && "sm:border-t lg:border-t-0",
              i > 0 && "lg:border-l",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium">{s.title}</span>
              <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition-all group-hover:translate-x-0.5" />
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {s.body}
            </p>
          </button>
        ))}
      </div>

      {/* Stats */}
      <section>
        <SectionTitle>At a glance</SectionTitle>
        <div className="border-border bg-card grid grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onOpen(s.tab)}
              className={cn(
                "hover:bg-muted/50 border-border px-5 py-4 text-left transition-colors",
                "border-t first:border-t-0 sm:border-t-0",
                i > 0 && "sm:border-l",
              )}
            >
              <div className="text-muted-foreground text-xs">{s.label}</div>
              <div
                className={cn(
                  "mt-1 text-2xl font-medium tabular-nums tracking-tight",
                  s.label === "Waiting for review" &&
                    s.value > 0 &&
                    "text-primary",
                )}
              >
                {s.value}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Review queue */}
        <section>
          <SectionTitle
            aside={
              <span className="text-muted-foreground text-xs">
                {drafts.length + fixes.length} item
                {drafts.length + fixes.length === 1 ? "" : "s"}
              </span>
            }
          >
            Needs your review
          </SectionTitle>
          <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
            {drafts.length + fixes.length === 0 && (
              <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                Nothing waiting. Drafts and reported fixes show up here.
              </p>
            )}
            {drafts.map((d) => (
              <div key={d._id} className="flex items-center gap-4 px-5 py-4">
                <KindTile kind={d.kind as DocKind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {DOC_META[d.kind as DocKind].title}
                    </span>
                    <Pill tone="amber">Draft</Pill>
                  </div>
                  <div className="text-muted-foreground mt-0.5 truncate text-xs">
                    {d.draftSourceTitles?.length
                      ? `From ${d.draftSourceTitles.join(", ")}`
                      : "AI draft"}
                    {d.draftCreatedAt ? ` · ${ago(d.draftCreatedAt)}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full px-3"
                  onClick={() => onOpen(TAB_FOR[d.kind as DocKind])}
                >
                  Review
                </Button>
              </div>
            ))}
            {fixes.map((f) => (
              <FixRow key={f._id} fix={f} />
            ))}
          </div>
        </section>

        {/* Pitfalls by last seen */}
        <section>
          <SectionTitle
            aside={
              <button
                onClick={() => onOpen("pitfalls")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs"
              >
                View all <ChevronRight className="size-3.5" />
              </button>
            }
          >
            Recent pitfalls
          </SectionTitle>
          <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
            {pitfalls.length === 0 && (
              <p className="text-muted-foreground px-5 py-8 text-center text-sm">
                No pitfalls yet.
              </p>
            )}
            {[...pitfalls]
              .sort((a, b) =>
                (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""),
              )
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpen("pitfalls")}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                >
                  <span className="bg-brand-soft text-primary inline-flex h-7 shrink-0 items-center rounded-md px-1.5 font-mono text-[11px] font-medium">
                    {p.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {p.lastSeen
                        ? `Last seen ${p.lastSeen.split(" ")[0]}`
                        : "Not seen yet"}
                      {p.nodes.length
                        ? ` · ${p.nodes.length} device${p.nodes.length === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </section>
      </div>

      {/* Documents */}
      <section>
        <SectionTitle>Documents</SectionTitle>
        <div className="border-border bg-card overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-xs">
                <th className="px-5 py-3 font-normal">Document</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal">Scope</th>
                <th className="px-5 py-3 font-normal">Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {(Object.keys(TAB_FOR) as DocKind[]).map((kind) => {
                const d = find(kind);
                const isShared = kind === "links" || kind === "glossary";
                return (
                  <tr
                    key={kind}
                    onClick={() => onOpen(TAB_FOR[kind])}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <KindTile kind={kind} small />
                        <span className="font-medium">
                          {DOC_META[kind].title}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Status doc={d} />
                    </td>
                    <td className="text-muted-foreground px-5 py-3.5">
                      {isShared ? "All campuses" : campus.name}
                    </td>
                    <td className="text-muted-foreground px-5 py-3.5 tabular-nums">
                      {d?.content.trim() ? ago(d.updatedAt) : "—"}
                    </td>
                    <td className="text-muted-foreground pr-4">
                      <ArrowUpRight className="size-4" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FixRow({ fix }: { fix: Doc<"fixProposals"> }) {
  const review = useMutation(api.fixes.review);
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState("");
  async function decide(approve: boolean) {
    setBusy(approve ? "yes" : "no");
    setError("");
    try {
      await review({ id: fix._id, approve });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }
  return (
    <div className="flex gap-4 px-5 py-4">
      <span className="bg-brand-soft text-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-medium">
        {fix.pitfallId}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Reported fix</span>
          <Pill tone="teal">Volunteer</Pill>
        </div>
        <p className="mt-1 text-sm">{fix.note}</p>
        <blockquote className="text-muted-foreground border-border mt-2 border-l-2 pl-3 text-xs leading-relaxed">
          “{fix.evidence}”
        </blockquote>
        {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
      </div>
      <div className="flex shrink-0 items-start gap-1.5">
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Reject"
          title="Reject"
          disabled={busy !== null}
          onClick={() => void decide(false)}
        >
          {busy === "no" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </Button>
        <Button
          size="icon-sm"
          aria-label="Approve and update last seen"
          title="Approve and update last seen"
          disabled={busy !== null}
          onClick={() => void decide(true)}
        >
          {busy === "yes" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-[15px] font-medium tracking-tight">{children}</h3>
      {aside}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "teal" | "amber" | "muted" | "blue";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        tone === "teal" && "bg-brand-soft text-primary",
        tone === "amber" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        tone === "blue" &&
          "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Status({ doc }: { doc: DocRow | undefined }) {
  if (doc?.generating) return <Pill tone="blue">Generating</Pill>;
  if (doc?.draft !== undefined)
    return <Pill tone="amber">Draft to review</Pill>;
  if (doc?.content.trim()) return <Pill tone="teal">Approved</Pill>;
  return <Pill tone="muted">Empty</Pill>;
}

const KIND_CODE: Record<DocKind, string> = {
  wiring: "W",
  pitfalls: "P",
  runbook: "R",
  systems: "S",
  links: "L",
  glossary: "T",
};

function KindTile({ kind, small }: { kind: DocKind; small?: boolean }) {
  return (
    <span
      className={cn(
        "border-border text-foreground/70 inline-flex shrink-0 items-center justify-center rounded-lg border font-medium",
        small ? "size-7 text-[11px]" : "size-9 rounded-xl text-xs",
      )}
    >
      {KIND_CODE[kind]}
    </span>
  );
}

function ago(ts: number) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
