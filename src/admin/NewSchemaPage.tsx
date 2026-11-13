import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { WiringGraph } from "@shared/wiring";
import { Button } from "@/components/ui/button";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

export type NewSchemaResult = {
  graph: WiringGraph;
  assumptions: string[];
  sourceTitles: string[];
};

type Picked = { file: File; kind: "txt" | "pdf" };

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function classify(file: File): Picked | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf"))
    return { file, kind: "pdf" };
  if (file.type.startsWith("text/") || /\.(txt|md)$/.test(name))
    return { file, kind: "txt" };
  return null;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Full-screen "New schema" page: describe the whole campus wiring in words
 * and/or drop in .txt or .pdf files, and the AI draws a fresh diagram from
 * them, the same way the very first diagram is created. The result opens in
 * the workspace for review; nothing replaces the current diagram until Save.
 */
export function NewSchemaPage({
  campusId,
  hasExisting,
  onResult,
  onClose,
}: {
  campusId: Id<"campuses"> | undefined;
  /** Whether a diagram exists already (the copy warns it will be replaced). */
  hasExisting: boolean;
  onResult: (result: NewSchemaResult) => void;
  onClose: () => void;
}) {
  const campuses = useQuery(api.campuses.list);
  const campusName =
    campuses?.find((c) => c._id === campusId)?.name ?? "Campus";
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const draw = useAction(api.ai.newWiringSchema);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"upload" | "draw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      const picked = classify(file);
      if (!picked) {
        setError(`${file.name}: only .txt, .md and .pdf files are accepted.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name}: files must be under 25 MB.`);
        continue;
      }
      if (next.some((p) => p.file.name === file.name && p.file.size === file.size))
        continue;
      if (next.length >= MAX_FILES) {
        setError(`At most ${MAX_FILES} files per schema.`);
        break;
      }
      next.push(picked);
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    addFiles(e.dataTransfer.files);
  }

  const canSubmit = !busy && (description.trim().length > 0 || files.length > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      setBusy("upload");
      const uploads: {
        storageId: Id<"_storage">;
        title: string;
        kind: "txt" | "pdf";
      }[] = [];
      for (const { file, kind } of files) {
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
        uploads.push({ storageId, title: file.name, kind });
      }
      setBusy("draw");
      const result = await draw({
        campusId,
        description: description.trim() || undefined,
        uploads,
      });
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={busy !== null}
          aria-label="Back to admin"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium">New wiring schema</span>
        <span className="text-muted-foreground hidden text-xs md:inline">
          {campusName}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <form
          onSubmit={submit}
          className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 md:px-8"
        >
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Describe the wiring and the AI draws it
            </h2>
            <p className="text-muted-foreground text-sm">
              Write out what plugs into what, attach a stage plot or patch
              list as .txt or .pdf, or both. The diagram opens in the workspace
              so you can adjust any device before saving.
              {hasExisting &&
                " Saving replaces the current diagram; the previous version is kept as a revision."}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-schema-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="new-schema-description"
              ref={textRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy !== null}
              rows={10}
              placeholder={
                "For example: Drums are on stage box A on the riser. Kick in is a Beta 91A into A1, kick out Beta 52 into A2. The playback Mac runs Ableton into a Clarett 8Pre; out 3 is click and it only ever goes to the IEM auxes. Stage box A goes over Cat6 to the LV1 at FOH..."
              }
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Files</div>
            <div
              role="button"
              tabIndex={0}
              aria-label="Add .txt or .pdf files"
              onClick={() => !busy && fileRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !busy) {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "text-muted-foreground flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors",
                dragging
                  ? "border-ring bg-muted/60 text-foreground"
                  : "hover:bg-muted/40 hover:text-foreground",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <Upload className="size-5" />
              <span>
                Drop .txt or .pdf files here, or{" "}
                <span className="text-foreground underline underline-offset-2">
                  choose files
                </span>
              </span>
              <span className="text-xs">
                Text is read out of each file. Scanned, image-only PDFs need
                the text pasted above instead.
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map(({ file, kind }) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                  >
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs uppercase">
                      {kind}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatBytes(file.size)}
                    </span>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${file.name}`}
                      disabled={busy !== null}
                      onClick={() =>
                        setFiles((f) => f.filter((p) => p.file !== file))
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Draw diagram
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            {busy && (
              <div className="flex items-center gap-2 text-sm">
                <LogoMark className="size-5" />
                <ShimmeringText
                  text={
                    busy === "upload"
                      ? "Uploading files…"
                      : files.length
                        ? "Reading the files and drawing the wiring…"
                        : "Drawing the wiring…"
                  }
                  startOnView={false}
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
