import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Response } from "@/components/ui/response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import {
  ConfirmDeleteButton,
  REVEAL_ON_HOVER,
} from "@/components/ConfirmDeleteButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toCsv } from "@shared/csv";
import { downloadCsv } from "@/lib/download";
import {
  BookOpen,
  Download,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";

/** One line per field so the agent reads each term as a small record. */
function termToMarkdown(t: {
  layman: string;
  technical: string;
  refersTo: string;
  description: string;
}) {
  const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();
  return (
    `## ${oneLine(t.layman)}\n` +
    `- Technical term: ${oneLine(t.technical)}\n` +
    (t.refersTo.trim() ? `- Refers to: ${oneLine(t.refersTo)}\n` : "") +
    (t.description.trim() ? `- Description: ${oneLine(t.description)}\n` : "")
  );
}

/**
 * Shared "glossary" document, edited as terminology entries: what people call
 * something, its technical name, what it refers to here, and what it is.
 */
export function TerminologyCard({ bare }: { bare?: boolean }) {
  const shared = useQuery(api.documents.listForCampus, {});
  const doc = shared?.find((d) => d.kind === "glossary");
  const save = useMutation(api.documents.save);
  const content = doc?.content ?? "";
  const [layman, setLayman] = useState("");
  const [technical, setTechnical] = useState("");
  const [refersTo, setRefersTo] = useState("");
  const [description, setDescription] = useState("");
  /** Section index of the term loaded into the form by its pencil, if any. */
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Each "## Term" section is one entry; anything before the first is kept.
  const sections = content.split(/^(?=## )/m);
  const terms = sections.flatMap((section, index) => {
    if (!section.startsWith("## ")) return [];
    const field = (name: string) =>
      section.match(new RegExp(`^- ${name}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? "";
    return [
      {
        index,
        layman: section.match(/^## (.+)$/m)![1]!.trim(),
        technical: field("Technical term"),
        refersTo: field("Refers to"),
        description: field("Description"),
      },
    ];
  });

  function clearForm() {
    setLayman("");
    setTechnical("");
    setRefersTo("");
    setDescription("");
    setEditIndex(null);
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function saveTerm(e: FormEvent) {
    e.preventDefault();
    if (!layman.trim() || !technical.trim()) return;
    const entry = termToMarkdown({ layman, technical, refersTo, description });
    const next =
      editIndex !== null
        ? sections
            .map((s, i) => (i === editIndex ? entry : s).trim())
            .filter(Boolean)
            .join("\n\n") + "\n"
        : content.trim()
          ? `${content.trimEnd()}\n\n${entry}`
          : entry;
    const name = layman.trim();
    void run(async () => {
      await save({
        kind: "glossary",
        content: next,
        note: editIndex !== null ? `Updated term: ${name}` : `Added term: ${name}`,
      });
      clearForm();
    });
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? terms.filter(
        (t) =>
          t.layman.toLowerCase().includes(q) ||
          t.technical.toLowerCase().includes(q),
      )
    : terms;

  return (
    <div className="space-y-4">
    <Card className={cn(bare && "bg-transparent shadow-none")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4" />
          Add terminology
          {terms.length > 0 ? (
            <Badge variant="secondary">
              {terms.length} term{terms.length === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge variant="outline">None yet</Badge>
          )}
        </CardTitle>
        <CardDescription>
          What volunteers call things and what they actually are, so the agent
          understands casual wording. Terms are shared across every campus and
          are saved immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} onSubmit={saveTerm} className="space-y-3">
          <Field label="Layman's terms: what people call it">
            <Input
              value={layman}
              onChange={(e) => setLayman(e.target.value)}
              placeholder="Ears"
              required
            />
          </Field>
          <Field label="Technical term">
            <Input
              value={technical}
              onChange={(e) => setTechnical(e.target.value)}
              placeholder="In-ear monitors (IEM)"
              required
            />
          </Field>
          <Field label="What it refers to (optional)">
            <Input
              value={refersTo}
              onChange={(e) => setRefersTo(e.target.value)}
              placeholder="The Shure PSM1000 bodypacks the band wears on stage"
            />
          </Field>
          <Field label="Description: what it actually is (optional)">
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wireless in-ear headphones that carry each musician's own monitor mix, including click, from the IEM auxes on the LV1."
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            {editIndex !== null && (
              <Button type="button" variant="ghost" size="sm" onClick={clearForm}>
                <X className="size-4" /> Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={busy || !layman.trim() || !technical.trim()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editIndex !== null ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editIndex !== null ? "Save term" : "Add term"}
            </Button>
          </div>
        </form>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>

    {/* Saved terms: searchable, scrolling list under the card. */}
    <section className="space-y-2" aria-label="Saved terms">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search terms by name"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              disabled={terms.length === 0}
              onClick={() =>
                downloadCsv(
                  toCsv(
                    ["Layman's term", "Technical term", "Refers to", "Description"],
                    terms.map((t) => [
                      t.layman,
                      t.technical,
                      t.refersTo,
                      t.description,
                    ]),
                  ),
                  "terminology.csv",
                )
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        {terms.length > 0 ? (
          <>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {shown.length === 0 && (
              <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                No terms match "{query.trim()}".
              </p>
            )}
            {shown.map((term) => (
              <div
                key={term.index}
                className={cn(
                  "bg-background group flex items-start gap-1 rounded-lg border p-3 text-sm transition-colors hover:border-ring/50",
                  editIndex === term.index && "border-ring",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-medium">{term.layman}</div>
                  {term.technical && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Technical: </span>
                      {term.technical}
                    </div>
                  )}
                  {term.refersTo && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Refers to: </span>
                      {term.refersTo}
                    </div>
                  )}
                  {term.description && (
                    <p className="text-muted-foreground text-xs">
                      {term.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`Edit ${term.layman}`}
                  aria-label={`Edit ${term.layman}`}
                  className={cn("text-muted-foreground shrink-0", REVEAL_ON_HOVER)}
                  onClick={() => {
                    setLayman(term.layman);
                    setTechnical(term.technical);
                    setRefersTo(term.refersTo);
                    setDescription(term.description);
                    setEditIndex(term.index);
                    formRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmDeleteButton
                  className={REVEAL_ON_HOVER}
                  what={term.layman}
                  description="This removes the term for every campus."
                  onConfirm={() => {
                    const next = sections
                      .filter((_, i) => i !== term.index)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join("\n\n");
                    if (editIndex === term.index) clearForm();
                    return save({
                      kind: "glossary",
                      content: next ? `${next}\n` : "",
                      note: `Removed term: ${term.layman}`,
                    });
                  }}
                />
              </div>
            ))}
          </div>
          </>
        ) : content.trim() ? (
          // Older free-form glossary text: shown as is until edited.
          <div className="bg-background max-h-96 overflow-auto rounded-md border p-3 text-sm">
            <Response>{content}</Response>
          </div>
        ) : (
          <EmptyState icon={<BookOpen className="size-5" />}>
            No terms yet. Add the first one above.
          </EmptyState>
        )}
    </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
