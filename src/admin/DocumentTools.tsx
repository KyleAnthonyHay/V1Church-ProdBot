import { useState, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  documentFilename,
  documentFromFile,
  validateImport,
} from "@shared/backup";
import type { ImportDocument } from "@shared/backup";

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DocumentTools({
  campusId,
  scopeName,
  docs,
  hasSources,
}: {
  campusId?: Id<"campuses">;
  scopeName: string;
  docs: Doc<"documents">[];
  hasSources: boolean;
}) {
  const generateAll = useAction(api.ai.generateAll);
  const importFiles = useMutation(api.documents.importFiles);
  const clear = useMutation(api.documents.clearCampus);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<ImportDocument[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const generating = docs.some((d) => d.generating);
  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap gap-2">
        {campusId && (
          <Button
            disabled={
              !!busy ||
              generating ||
              !hasSources ||
              docs.some((d) => d.draft !== undefined)
            }
            onClick={() =>
              void run("Generating all…", () => generateAll({ campusId }))
            }
          >
            Generate all drafts
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!!busy || !docs.some((d) => d.content.trim())}
          onClick={() =>
            void run("Exporting…", async () => {
              const { zipSync, strToU8 } = await import("fflate");
              const files = Object.fromEntries(
                docs
                  .filter((d) => d.content.trim())
                  .map((d) => [documentFilename(d.kind), strToU8(d.content)]),
              );
              const bytes = zipSync(files);
              download(
                new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
                `${scopeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-docs.zip`,
              );
            })
          }
        >
          Export approved docs
        </Button>
        <Button
          variant="outline"
          disabled={!!busy || generating}
          onClick={() => input.current?.click()}
        >
          Import YAML / markdown
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".yaml,.yml,.md"
          className="hidden"
          aria-label="Import documents"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void run("Reading files…", async () => {
              if (files.reduce((n, f) => n + f.size, 0) > 3_200_000)
                throw new Error("Files are too large");
              const imported = await Promise.all(
                files.map(async (f) =>
                  documentFromFile(f.name, await f.text()),
                ),
              );
              setPending(validateImport(imported, !campusId));
            });
          }}
        />
        {campusId && (
          <Button
            variant="destructive"
            disabled={!!busy || generating}
            onClick={() => {
              const confirmation = prompt(
                `Clear all documentation, drafts, revisions, source uploads, checklists and fix reviews for ${scopeName}? Conversations remain. Export a backup first. Type ${scopeName} to continue.`,
              );
              if (confirmation === scopeName)
                void run("Clearing…", () => clear({ campusId, confirmation }));
            }}
          >
            Clear campus documentation
          </Button>
        )}
      </div>
      {campusId && (
        <p className="text-muted-foreground text-xs">
          Generate all creates wiring, pitfalls, runbook, then systems. Review
          existing drafts first; approve the new wiring before its dependent
          drafts.
        </p>
      )}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm">
            Import{" "}
            {pending
              .map(
                (f) =>
                  `${f.kind} (${f.content.length.toLocaleString()} characters)`,
              )
              .join(", ")}{" "}
            into {scopeName} as drafts?
          </p>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Importing…", async () => {
                await importFiles({ campusId, files: pending });
                setPending([]);
              })
            }
          >
            Create review drafts
          </Button>
          <Button variant="ghost" onClick={() => setPending([])}>
            Cancel
          </Button>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
