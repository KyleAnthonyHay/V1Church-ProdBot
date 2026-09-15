/** Populate an empty development campus for browser verification. */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Development only");
const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
const campus = (await client.query(api.campuses.list, {})).find(
  (c) => c.slug === "brooklyn",
)!;
if (
  (await client.query(api.documents.listForCampus, { campusId: campus._id }))
    .length
)
  throw new Error("Campus already has documents; will not overwrite");
const created = [];
for (const kind of ["wiring", "pitfalls", "runbook", "systems"] as const) {
  const content =
    kind === "systems"
      ? "# Verification inventory\n\nFictional playback system. Original version."
      : readFileSync(
          new URL(
            `../tests/fixtures/${kind}.${kind === "wiring" ? "yaml" : "md"}`,
            import.meta.url,
          ),
          "utf8",
        );
  const id = await client.mutation(api.documents.save, {
    campusId: campus._id,
    kind,
    content,
  });
  created.push({ id, content });
}
await client.mutation(api.documents.importFiles, {
  campusId: campus._id,
  files: [
    {
      kind: "systems",
      content:
        "# Verification inventory\n\nFictional playback system. Proposed updated inventory.",
    },
  ],
});
mkdirSync(".verification", { recursive: true });
writeFileSync(".verification/preview-docs.json", JSON.stringify(created));
console.log(
  "Created 4 clearly labeled verification documents in empty Brooklyn dev campus",
);
