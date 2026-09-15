import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  CAMPUS_DOC_KINDS,
  SHARED_DOC_KINDS,
  DOC_META,
  parsePitfalls,
  parseRunbookSteps,
  pitfallsTouching,
  validatePitfallRefs,
  type DocKind,
} from "@shared/docs";
import { diffWiring, parseWiringYaml, type WiringDiff } from "@shared/wiring";
import { DocumentTools } from "./DocumentTools";
import { FixReviewPanel } from "./FixReviewPanel";
const WiringDiagram = lazy(() =>
  import("@/components/WiringDiagram").then((m) => ({
    default: m.WiringDiagram,
  })),
);
import { Response } from "@/components/ui/response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Check,
  History,
  Loader2,
  Save,
  Sparkles,
  X,
  FileCode2,
  RotateCcw,
} from "lucide-react";

type DocRow = Doc<"documents">;

export function DocumentsPanel({
  campusId,
  scope,
  scopeName,
}: {
  campusId: Id<"campuses"> | undefined;
  scope: "campus" | "shared";
  scopeName: string;
}) {
  const docs = useQuery(api.documents.listForCampus, { campusId });
  const sources = useQuery(api.sources.list, { campusId });
  const kinds: readonly DocKind[] =
    scope === "campus" ? CAMPUS_DOC_KINDS : SHARED_DOC_KINDS;
  const byKind = useMemo(
    () => new Map((docs ?? []).map((d) => [d.kind as DocKind, d])),
    [docs],
  );
  const readySources = sources?.filter((s) => s.status === "ready").length ?? 0;

  if (docs === undefined) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <p className="text-muted-foreground text-sm">
        {readySources === 0
          ? `No source material for ${scopeName} yet. Add some under Sources, or write the documents by hand below.`
          : `${readySources} source(s) ready. Generate a draft, review it, then approve. Approving keeps the previous version as a revision.`}
      </p>
      <DocumentTools
        campusId={campusId}
        scopeName={scopeName}
        docs={docs}
        hasSources={readySources > 0}
      />
      {campusId && <FixReviewPanel campusId={campusId} />}
      {kinds.map((kind) => (
        <DocCard
          key={kind}
          kind={kind}
          campusId={campusId}
          doc={byKind.get(kind)}
          allDocs={byKind}
          hasSources={readySources > 0}
        />
      ))}
    </div>
  );
}

function DocCard({
  kind,
  campusId,
  doc,
  allDocs,
  hasSources,
}: {
  kind: DocKind;
  campusId: Id<"campuses"> | undefined;
  doc: DocRow | undefined;
  allDocs: Map<DocKind, DocRow>;
  hasSources: boolean;
}) {
  const meta = DOC_META[kind];
  const save = useMutation(api.documents.save);
  const remove = useMutation(api.documents.remove);
  const approve = useMutation(api.documents.approveDraft);
  const discard = useMutation(api.documents.discardDraft);
  const generate = useAction(api.ai.generateDocument);
  const savedContent = doc?.content ?? "";
  const [editor, setEditor] = useState(savedContent);
  const [note, setNote] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showFormat, setShowFormat] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the editor in sync when the saved content changes underneath us (approve, restore, other admin).
  useEffect(() => {
    setEditor(savedContent);
  }, [savedContent]);

  const dirty = editor !== savedContent;
  const wiringNow = allDocs.get("wiring")?.content ?? "";
  const currentGraph = useMemo(
    () => parseWiringYaml(wiringNow).graph,
    [wiringNow],
  );
  const pitfalls = useMemo(
    () => parsePitfalls(allDocs.get("pitfalls")?.content ?? ""),
    [allDocs],
  );
  const runbookSteps = useMemo(
    () => parseRunbookSteps(allDocs.get("runbook")?.content ?? ""),
    [allDocs],
  );

  // Live validation of what is in the editor.
  const editorParsed = useMemo(
    () => (kind === "wiring" ? parseWiringYaml(editor) : null),
    [kind, editor],
  );
  const editorIssues = useMemo(() => {
    if (kind === "wiring") return editorParsed?.issues ?? [];
    if (kind === "pitfalls" && currentGraph)
      return validatePitfallRefs(
        parsePitfalls(editor),
        new Set(currentGraph.nodes.map((n) => n.id)),
      );
    return [];
  }, [kind, editor, editorParsed, currentGraph]);
  const editorDiff = useMemo(
    () =>
      kind === "wiring" && dirty && editorParsed?.graph
        ? diffWiring(currentGraph, editorParsed.graph)
        : null,
    [kind, dirty, editorParsed, currentGraph],
  );

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const status = doc?.generating
    ? "generating"
    : doc?.draft !== undefined
      ? "draft"
      : savedContent.trim()
        ? "documented"
        : "empty";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {meta.title}
              {status === "empty" && (
                <Badge variant="outline">Not documented</Badge>
              )}
              {status === "documented" && (
                <Badge variant="secondary">Documented</Badge>
              )}
              {status === "draft" && (
                <Badge className="bg-amber-500 text-black">
                  Draft awaiting review
                </Badge>
              )}
              {status === "generating" && (
                <Badge variant="secondary">
                  <Loader2 className="size-3 animate-spin" /> Generating
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFormat((s) => !s)}
            >
              <FileCode2 className="size-4" /> Format
            </Button>
            {doc && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevisions((s) => !s)}
              >
                <History className="size-4" /> History
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showFormat && (
          <pre className="bg-muted/40 overflow-x-auto rounded-md p-3 font-mono text-xs">
            {meta.template}
          </pre>
        )}
        {showRevisions && doc && <RevisionList documentId={doc._id} />}

        {/* Generate */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Optional instructions for the AI (e.g. 'only update the keys section')"
            className="max-w-md"
          />
          <Button
            variant="secondary"
            disabled={
              busy !== null ||
              Boolean(doc?.generating) ||
              (!hasSources && !savedContent.trim() && !instructions.trim())
            }
            onClick={() =>
              void run("generate", () =>
                generate({
                  campusId,
                  kind,
                  instructions: instructions || undefined,
                }),
              )
            }
            title={
              hasSources
                ? "Draft this document from the sources"
                : "Add sources first"
            }
          >
            {busy === "generate" || doc?.generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {savedContent.trim()
              ? "Update draft from sources"
              : "Generate from sources"}
          </Button>
          {doc?.generateError && (
            <span className="text-destructive text-xs">
              {doc.generateError}
            </span>
          )}
        </div>

        {/* Draft review */}
        {doc?.draft !== undefined && (
          <DraftPanel
            kind={kind}
            doc={doc}
            currentGraph={currentGraph}
            pitfalls={pitfalls}
            runbookSteps={runbookSteps}
            busy={busy}
            onApprove={() =>
              void run("approve", () => approve({ id: doc._id }))
            }
            onDiscard={() =>
              void run("discard", () => discard({ id: doc._id }))
            }
            onLoad={() => setEditor(doc.draft ?? "")}
          />
        )}

        {/* Editor */}
        <div className="space-y-2">
          <Textarea
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
            rows={kind === "wiring" ? 16 : 12}
            placeholder={`Nothing here yet. Generate from sources or write it by hand in the format shown under "Format".`}
            className="font-mono text-xs"
            spellCheck={false}
          />
          {editorIssues.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="size-3" /> {editorIssues.length}{" "}
                issue(s)
              </div>
              <ul className="list-disc pl-4">
                {editorIssues.slice(0, 8).map((i, n) => (
                  <li key={n}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {editorDiff && (
            <ImpactNote
              diff={editorDiff}
              pitfalls={pitfalls}
              runbookSteps={runbookSteps}
              verb="saving"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed? (kept with the revision)"
              className="max-w-sm"
            />
            <Button
              disabled={!dirty || busy !== null}
              onClick={() =>
                void run("save", async () => {
                  await save({
                    campusId,
                    kind,
                    content: editor,
                    note: note || undefined,
                  });
                  setNote("");
                })
              }
            >
              {busy === "save" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}{" "}
              Save
            </Button>
            {dirty && (
              <Button variant="ghost" onClick={() => setEditor(savedContent)}>
                <RotateCcw className="size-4" /> Revert
              </Button>
            )}
            {doc && (
              <Button
                variant="destructive"
                disabled={busy !== null || Boolean(doc.generating)}
                onClick={() => {
                  if (
                    confirm(
                      `Delete ${meta.title}, its draft and all revisions? Export a backup first.`,
                    )
                  )
                    void run("delete", () => remove({ id: doc._id }));
                }}
              >
                Delete document
              </Button>
            )}
            {doc?.updatedAt && savedContent.trim() && (
              <span className="text-muted-foreground text-xs">
                Last saved {new Date(doc.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DraftPanel({
  kind,
  doc,
  currentGraph,
  pitfalls,
  runbookSteps,
  busy,
  onApprove,
  onDiscard,
  onLoad,
}: {
  kind: DocKind;
  doc: DocRow;
  currentGraph: ReturnType<typeof parseWiringYaml>["graph"];
  pitfalls: ReturnType<typeof parsePitfalls>;
  runbookSteps: ReturnType<typeof parseRunbookSteps>;
  busy: string | null;
  onApprove: () => void;
  onDiscard: () => void;
  onLoad: () => void;
}) {
  const draft = doc.draft ?? "";
  const draftParsed = useMemo(
    () => (kind === "wiring" ? parseWiringYaml(draft) : null),
    [kind, draft],
  );
  const diff = useMemo(
    () =>
      draftParsed?.graph ? diffWiring(currentGraph, draftParsed.graph) : null,
    [draftParsed, currentGraph],
  );
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">AI draft</span>
        <span className="text-muted-foreground text-xs">
          {doc.draftCreatedAt
            ? new Date(doc.draftCreatedAt).toLocaleString()
            : ""}
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? "Preview" : "Raw"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onLoad}
          title="Copy the draft into the editor to tweak before saving"
        >
          Load into editor
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={onDiscard}
        >
          <X className="size-4" /> Discard
        </Button>
        <Button
          size="sm"
          disabled={
            busy !== null ||
            (kind === "wiring" &&
              (!draftParsed?.graph || !!draftParsed.issues.length))
          }
          onClick={onApprove}
        >
          {busy === "approve" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}{" "}
          Approve
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Sources:{" "}
        {doc.draftSourceIds?.length
          ? doc.draftSourceIds
              .map(
                (id, i) =>
                  `${doc.draftSourceTitles?.[i] ?? "Deleted source"} (${id})`,
              )
              .join(", ")
          : "No source files recorded (manual instructions, import, or older draft)."}
      </p>
      {doc.draftWiringYaml !== undefined && (
        <p className="text-xs text-muted-foreground">
          This draft is tied to the wiring used during generation. Approve that
          wiring before this draft.
        </p>
      )}
      {doc.draftNotes && (
        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
          <div className="mb-1 font-medium text-amber-800 dark:text-amber-200">
            The AI flagged these for a human to confirm
          </div>
          <Response>{doc.draftNotes}</Response>
        </div>
      )}

      {kind === "wiring" ? (
        <div className="mt-2 space-y-2">
          {draftParsed?.issues.length ? (
            <div className="text-destructive text-xs">
              Draft problems: {draftParsed.issues.slice(0, 5).join("; ")}
            </div>
          ) : null}
          {diff && (
            <ImpactNote
              diff={diff}
              pitfalls={pitfalls}
              runbookSteps={runbookSteps}
              verb="approving"
            />
          )}
          {showRaw || !draftParsed?.graph ? (
            <pre className="bg-muted/40 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs">
              {draft}
            </pre>
          ) : (
            <div className="bg-background h-[420px] rounded-md border">
              <Suspense fallback={<p className="p-4">Loading diagram…</p>}>
                <WiringDiagram
                  graph={draftParsed.graph}
                  pitfalls={pitfalls}
                  highlightIds={diff?.touchedNodeIds ?? []}
                />
              </Suspense>
            </div>
          )}
        </div>
      ) : showRaw ? (
        <pre className="bg-muted/40 mt-2 max-h-80 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
          {draft}
        </pre>
      ) : (
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div className="bg-background max-h-96 overflow-auto rounded-md border p-3 text-sm">
            <h4 className="mb-2 font-semibold">Current approved document</h4>
            <Response>{doc.content || "_No approved content yet._"}</Response>
          </div>
          <div className="bg-background max-h-96 overflow-auto rounded-md border p-3 text-sm">
            <h4 className="mb-2 font-semibold">Proposed draft</h4>
            <Response>{draft}</Response>
          </div>
        </div>
      )}
    </div>
  );
}

/** The note to the admin: what this wiring change touches elsewhere. */
function ImpactNote({
  diff,
  pitfalls,
  runbookSteps,
  verb,
}: {
  diff: WiringDiff;
  pitfalls: ReturnType<typeof parsePitfalls>;
  runbookSteps: ReturnType<typeof parseRunbookSteps>;
  verb: string;
}) {
  const touchedPitfalls = pitfallsTouching(pitfalls, diff.touchedNodeIds);
  const touchedPitfallIds = new Set(touchedPitfalls.map((p) => p.id));
  const touchedSteps = runbookSteps.filter((s) =>
    s.pitfalls.some((p) => touchedPitfallIds.has(p)),
  );
  const nothing =
    diff.addedNodes.length +
      diff.removedNodes.length +
      diff.changedNodes.length +
      diff.addedEdges.length +
      diff.removedEdges.length ===
    0;
  if (nothing)
    return (
      <p className="text-muted-foreground text-xs">
        No wiring changes compared to the saved version.
      </p>
    );
  return (
    <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-2 text-xs">
      <div className="mb-1 font-medium text-sky-800 dark:text-sky-200">
        Wiring changes
      </div>
      <ul className="list-disc pl-4">
        {diff.addedNodes.length > 0 && (
          <li>Added devices: {diff.addedNodes.map((n) => n.id).join(", ")}</li>
        )}
        {diff.removedNodes.length > 0 && (
          <li>
            Removed devices: {diff.removedNodes.map((n) => n.id).join(", ")}
          </li>
        )}
        {diff.changedNodes.length > 0 && (
          <li>
            Changed devices:{" "}
            {diff.changedNodes.map((c) => c.after.id).join(", ")}
          </li>
        )}
        {diff.addedEdges.length > 0 && (
          <li>{diff.addedEdges.length} connection(s) added</li>
        )}
        {diff.removedEdges.length > 0 && (
          <li>{diff.removedEdges.length} connection(s) removed</li>
        )}
      </ul>
      {(touchedPitfalls.length > 0 ||
        touchedSteps.length > 0 ||
        diff.removedNodes.length > 0) && (
        <div className="mt-2 border-t border-sky-500/30 pt-2">
          <div className="mb-1 flex items-center gap-1 font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-3" /> Review after {verb}
          </div>
          <ul className="list-disc pl-4">
            {touchedPitfalls.map((p) => (
              <li key={p.id}>
                Pitfall <span className="font-mono">{p.id}</span> ({p.title})
                references a changed device
              </li>
            ))}
            {touchedSteps.map((s) => (
              <li key={s.number}>
                Runbook step {s.number} ({s.step.slice(0, 60)}
                {s.step.length > 60 ? "…" : ""}) points at an affected pitfall
              </li>
            ))}
            {diff.removedNodes.length > 0 && (
              <li>
                Removed device ids will show as unknown references in Pitfalls
                until they are updated.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function RevisionList({ documentId }: { documentId: Id<"documents"> }) {
  const revisions = useQuery(api.documents.revisions, { documentId });
  const restore = useMutation(api.documents.restoreRevision);
  if (!revisions) return null;
  if (revisions.length === 0)
    return (
      <p className="text-muted-foreground text-xs">No earlier versions yet.</p>
    );
  return (
    <div className="space-y-1 rounded-md border p-2 text-xs">
      {revisions.map((r) => (
        <div key={r._id} className="flex items-center gap-2">
          <span className="text-muted-foreground w-40 shrink-0">
            {new Date(r.savedAt).toLocaleString()}
          </span>
          <span className="min-w-0 flex-1 truncate">{r.note}</span>
          <span className="text-muted-foreground">
            {r.content.length.toLocaleString()} chars
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (
                confirm(
                  "Restore this version? The current version is kept as a revision.",
                )
              )
                void restore({ revisionId: r._id });
            }}
          >
            Restore
          </Button>
        </div>
      ))}
    </div>
  );
}
