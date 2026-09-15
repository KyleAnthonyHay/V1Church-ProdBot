import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
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
import { FileText, Loader2, Trash2, Upload, Eye, EyeOff } from "lucide-react";

export function SourcesPanel({
  campusId,
  scopeName,
}: {
  campusId: Id<"campuses"> | undefined;
  scopeName: string;
}) {
  const sources = useQuery(api.sources.list, { campusId });
  const createPaste = useMutation(api.sources.createPaste);
  const createUpload = useMutation(api.sources.createUpload);
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const remove = useMutation(api.sources.remove);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addPaste(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createPaste({ campusId, title, text });
      setTitle("");
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        const isTxt =
          file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
        if (!isPdf && !isTxt)
          throw new Error(`${file.name}: only .txt, .md and .pdf are accepted`);
        const url = await generateUploadUrl({});
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        await createUpload({
          campusId,
          title: file.name,
          kind: isPdf ? "pdf" : "txt",
          storageId,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Add source material for {scopeName}
            </CardTitle>
            <CardDescription>
              Describe the room in your own words, paste notes, or upload .txt /
              .pdf files. Then go to Documents and generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addPaste} className="space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. Stage patch as of Sept 2026)"
              />
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder={`Natural language is fine. Example:\n\nDrums are on stage box A on the riser. Kick in is a Beta 91A into A1, kick out Beta 52 into A2... The playback Mac runs Ableton into a Clarett 8Pre; out 3 is click and it only ever goes to the IEM auxes...`}
                className="font-mono text-xs"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={busy || !text.trim()}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}{" "}
                  Add pasted text
                </Button>
                <span className="text-muted-foreground text-xs">
                  {text.length.toLocaleString()} chars
                </span>
              </div>
            </form>
            <div className="border-border rounded-md border border-dashed p-3">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => void addFiles(e.target.files)}
              />
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> Upload .txt or .pdf
              </Button>
              <p className="text-muted-foreground mt-2 text-xs">
                PDF text is extracted on the server. Scanned PDFs with no text
                layer will fail; paste the text instead.
              </p>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          Sources for {scopeName}{" "}
          <span className="text-muted-foreground">
            ({sources?.length ?? 0})
          </span>
        </h3>
        {sources?.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing added yet.</p>
        )}
        {sources?.map((s) => (
          <SourceRow
            key={s._id}
            source={s}
            onDelete={() => void remove({ id: s._id })}
          />
        ))}
      </div>
    </div>
  );
}

type SourceRowData = {
  _id: Id<"sources">;
  title: string;
  kind: "paste" | "txt" | "pdf";
  status: "pending" | "ready" | "error";
  error?: string;
  charCount: number;
  createdAt: number;
};

function SourceRow({
  source,
  onDelete,
}: {
  source: SourceRowData;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const text = useQuery(
    api.sources.getText,
    open ? { id: source._id } : "skip",
  );
  return (
    <div className="bg-card rounded-md border p-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="uppercase">
          {source.kind}
        </Badge>
        <span className="min-w-0 flex-1 truncate font-medium">
          {source.title}
        </span>
        {source.status === "pending" && (
          <Badge variant="secondary">
            <Loader2 className="size-3 animate-spin" /> Extracting
          </Badge>
        )}
        {source.status === "error" && (
          <Badge variant="destructive">Failed</Badge>
        )}
        {source.status === "ready" && (
          <span className="text-muted-foreground text-xs">
            {source.charCount.toLocaleString()} chars
          </span>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen((o) => !o)}
          title="Preview text"
          disabled={source.status !== "ready"}
        >
          {open ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:text-destructive"
          title="Delete"
          onClick={() => {
            if (confirm(`Delete "${source.title}"?`)) onDelete();
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        {new Date(source.createdAt).toLocaleString()}
      </div>
      {source.error && (
        <p className="text-destructive mt-1 text-xs">{source.error}</p>
      )}
      {open && (
        <pre className="bg-muted/40 mt-2 max-h-64 overflow-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
          {text ?? "Loading…"}
        </pre>
      )}
    </div>
  );
}
