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
  Download,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";

/** Shared "links" document, edited as a simple add-a-link form. */
export function LinksCard({ bare }: { bare?: boolean }) {
  const shared = useQuery(api.documents.listForCampus, {});
  const doc = shared?.find((d) => d.kind === "links");
  const save = useMutation(api.documents.save);
  const content = doc?.content ?? "";
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  /** Section index of the link loaded into the form by its pencil, if any. */
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  function clearForm() {
    setTitle("");
    setUrl("");
    setNote("");
    setEditIndex(null);
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  function addLink(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;
    if (!/^https?:\/\//i.test(u)) {
      setError("The link must start with http:// or https://");
      return;
    }
    const entry =
      `## ${t}\n- Link: ${u}\n` +
      (note.trim() ? `- What to know: ${note.trim()}\n` : "");
    const next =
      editIndex !== null
        ? sections
            .map((s, i) => (i === editIndex ? entry : s).trim())
            .filter(Boolean)
            .join("\n\n") + "\n"
        : content.trim()
          ? `${content.trimEnd()}\n\n${entry}`
          : entry;
    void run(async () => {
      await save({
        kind: "links",
        content: next,
        note: editIndex !== null ? `Updated link: ${t}` : `Added link: ${t}`,
      });
      clearForm();
    });
  }

  // Each "## Title" section is one link; anything before the first is kept.
  const sections = content.split(/^(?=## )/m);
  const links = sections.flatMap((section, index) => {
    const heading = section.match(/^## (.+)$/m);
    if (!heading || !section.startsWith("## ")) return [];
    return [
      {
        index,
        title: heading[1]!.trim(),
        url: section.match(/^- Link:\s*(\S+)/im)?.[1],
        note: section.match(/^- What to know:\s*(.+)$/im)?.[1]?.trim(),
      },
    ];
  });
  const linkCount = links.length;

  const q = query.trim().toLowerCase();
  const shown = q
    ? links.filter((l) => l.title.toLowerCase().includes(q))
    : links;

  return (
    <div className="space-y-4">
    <Card className={cn(bare && "bg-transparent shadow-none")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" />
          Add documentation link
          {linkCount > 0 ? (
            <Badge variant="secondary">
              {linkCount} link{linkCount === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge variant="outline">None yet</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Manuals and vendor pages the team should know about. Links are shared
          across every campus and are saved immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} onSubmit={addLink} className="space-y-3">
          <Field label="Name: what the page or manual is">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Waves eMotion LV1 manual"
              required
            />
          </Field>
          <Field label="Link: the full web address">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.waves.com/mixers-racks/emotion-lv1"
              type="url"
              required
            />
          </Field>
          <Field label="What to know (optional)">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="If the SoundGrid server is unassigned, the UI keeps running but audio stops."
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            {editIndex !== null && (
              <Button type="button" variant="ghost" size="sm" onClick={clearForm}>
                <X className="size-4" /> Cancel
              </Button>
            )}
            <Button type="submit" disabled={busy || !title.trim() || !url.trim()}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editIndex !== null ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editIndex !== null ? "Save link" : "Add link"}
            </Button>
          </div>
        </form>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>

    {/* Saved links: searchable, scrolling list under the card. */}
    <section className="space-y-2" aria-label="Saved links">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search links by name"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              disabled={links.length === 0}
              onClick={() =>
                downloadCsv(
                  toCsv(
                    ["Name", "Link", "What to know"],
                    links.map((l) => [l.title, l.url ?? "", l.note ?? ""]),
                  ),
                  "documentation-links.csv",
                )
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        {links.length > 0 ? (
          <>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {shown.length === 0 && (
              <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                No links match "{query.trim()}".
              </p>
            )}
            {shown.map((link) => (
              <div
                key={link.index}
                className={cn(
                  "bg-background group flex items-start gap-1 rounded-lg border p-3 text-sm transition-colors hover:border-ring/50",
                  editIndex === link.index && "border-ring",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-medium">{link.title}</div>
                  {link.url && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary block truncate text-xs underline underline-offset-2"
                    >
                      {link.url}
                    </a>
                  )}
                  {link.note && (
                    <p className="text-muted-foreground text-xs">{link.note}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={`Edit ${link.title}`}
                  aria-label={`Edit ${link.title}`}
                  className={cn("text-muted-foreground shrink-0", REVEAL_ON_HOVER)}
                  onClick={() => {
                    setTitle(link.title);
                    setUrl(link.url ?? "");
                    setNote(link.note ?? "");
                    setEditIndex(link.index);
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
                  what={link.title}
                  description="This removes the link for every campus."
                  onConfirm={() => {
                    const next = sections
                      .filter((_, i) => i !== link.index)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join("\n\n");
                    return save({
                      kind: "links",
                      content: next ? `${next}\n` : "",
                      note: `Removed link: ${link.title}`,
                    });
                  }}
                />
              </div>
            ))}
          </div>
          </>
        ) : content.trim() ? (
          <div className="bg-background max-h-96 overflow-auto rounded-md border p-3 text-sm">
            <Response>{content}</Response>
          </div>
        ) : (
          <EmptyState icon={<Link2 className="size-5" />}>
            No links yet. Add the first one above.
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
