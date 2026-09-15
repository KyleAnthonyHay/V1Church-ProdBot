import { CAMPUS_DOC_KINDS, SHARED_DOC_KINDS, type DocKind } from "./docs";
import { parseWiringYaml } from "./wiring";

export type ImportDocument = { kind: DocKind; content: string };
export const MAX_IMPORT_CHARS = 800_000;
export function validateImport(docs: ImportDocument[], shared: boolean) {
  const allowed: readonly string[] = shared
    ? SHARED_DOC_KINDS
    : CAMPUS_DOC_KINDS;
  if (!docs.length) throw new Error("No documents to import");
  const seen = new Set<string>();
  let total = 0;
  for (const doc of docs) {
    if (!allowed.includes(doc.kind))
      throw new Error(`${doc.kind} does not belong in this scope`);
    if (seen.has(doc.kind)) throw new Error(`Duplicate ${doc.kind} file`);
    seen.add(doc.kind);
    total += doc.content.length;
    if (doc.kind === "wiring" && doc.content.trim()) {
      const parsed = parseWiringYaml(doc.content);
      if (!parsed.graph || parsed.issues.length)
        throw new Error(`Invalid wiring: ${parsed.issues.join("; ")}`);
    }
  }
  if (total > MAX_IMPORT_CHARS)
    throw new Error("Import exceeds 800,000 characters");
  return docs;
}
export function documentFilename(kind: DocKind) {
  return `${kind}.${kind === "wiring" ? "yaml" : "md"}`;
}
export function documentFromFile(
  name: string,
  content: string,
): ImportDocument {
  const match = name.match(
    /^(wiring)\.ya?ml$|^(pitfalls|runbook|systems|links|glossary)\.md$/,
  );
  if (!match) throw new Error(`Unsupported document filename: ${name}`);
  return { kind: (match[1] ?? match[2]) as DocKind, content };
}
