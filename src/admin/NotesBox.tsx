import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, FileText, Loader2, Trash2, Upload } from "lucide-react";

export type NoteTopic = "wiring" | "pitfalls";

/**
 * Notes for one admin category: paste text or upload .txt/.pdf, and see what
 * is on file. The AI drafts the document from these.
 */
export function NotesBox({
  campusId,
  topic,
  placeholder,
}: {
  campusId: Id<"campuses">;
  topic: NoteTopic;
  placeholder: string;
}) {
  const all = useQuery(api.sources.list, { campusId });
  // Older notes have no topic; show them under both categories.
  const sources = all?.filter((s) => !s.topic || s.topic === topic);
  const createPaste = useMutation(api.sources.createPaste);
  const createUpload = useMutation(api.sources.createUpload);
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const remove = useMutation(api.sources.remove);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addPaste(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createPaste({ campusId, title, text, topic });
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
          topic,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const count = sources?.length ?? 0;

  return (
    <div className="space-y-3">
      <form onSubmit={addPaste} className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional, e.g. Stage patch as of Sept 2026)"
        />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={placeholder}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy || !text.trim()}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Add notes
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => void addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" /> Upload .txt or .pdf
          </Button>
        </div>
      </form>
      {error && <p className="text-destructive text-sm">{error}</p>}

      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
        onClick={() => setShowList((s) => !s)}
      >
        {count === 0
          ? "No notes on file yet"
          : `${showList ? "Hide" : "Show"} notes on file (${count})`}
      </button>
      {showList && count > 0 && (
        <div className="space-y-2">
          {sources?.map((s) => (
            <SourceRow
              key={s._id}
              source={s}
              onDelete={() => void remove({ id: s._id })}
            />
          ))}
        </div>
      )}
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
    <div className="bg-background rounded-md border p-2.5 text-sm">
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
            {source.charCount.toLocaleString()} chars ·{" "}
            {new Date(source.createdAt).toLocaleDateString()}
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
