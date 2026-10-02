import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Campus } from "@/App";
import type { DocKind } from "@shared/docs";
import { DocumentCard } from "@/admin/DocumentCard";
import { NotesBox } from "@/admin/NotesBox";
import { LinksCard } from "@/admin/LinksCard";
import { TerminologyCard } from "@/admin/TerminologyCard";
import { AlertTriangle, BookOpen, Link2, Network } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "wiring" | "pitfalls" | "links" | "terminology";
const CATEGORIES: {
  id: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "wiring", label: "Wiring diagram", icon: Network },
  { id: "pitfalls", label: "Common pitfalls", icon: AlertTriangle },
  { id: "links", label: "Documentation link", icon: Link2 },
  { id: "terminology", label: "Terminology", icon: BookOpen },
];

export function AdminView({ campus }: { campus: Campus }) {
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const sources = useQuery(api.sources.list, { campusId: campus._id });
  const byKind = useMemo(
    () => new Map((docs ?? []).map((d) => [d.kind as DocKind, d])),
    [docs],
  );
  const hasSources =
    (sources?.filter((s) => s.status === "ready").length ?? 0) > 0;
  const [category, setCategory] = useState<Category>("wiring");

  if (docs === undefined) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full space-y-6 px-4 py-4 pb-16 md:px-8 md:py-6">
        <header>
          <div className="text-muted-foreground text-xs font-medium">
            {campus.name}
          </div>
          <h2 className="text-2xl font-medium tracking-[-0.03em]">
            Add documentation
          </h2>
        </header>

        <div
          role="tablist"
          aria-label="Documentation type"
          className="bg-muted flex gap-1 rounded-2xl p-1"
        >
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <c.icon className="size-4" />
                {c.label}
              </button>
            );
          })}
        </div>

        {category === "wiring" && (
          <DocumentCard
            bare
            kind="wiring"
            campusId={campus._id}
            doc={byKind.get("wiring")}
            allDocs={byKind}
            hasSources={hasSources}
            title="Add / update wiring diagram"
            description="Open the diagram to describe what plugs into what; the AI draws it and you can adjust any device by hand. Volunteers see it under Explore and the agent walks it when troubleshooting."
          />
        )}
        {category === "pitfalls" && (
          <DocumentCard
            bare
            kind="pitfalls"
            campusId={campus._id}
            doc={byKind.get("pitfalls")}
            allDocs={byKind}
            hasSources={hasSources}
            title="Add common pitfalls documentation"
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
        {category === "links" && <LinksCard bare />}
        {category === "terminology" && <TerminologyCard bare />}
      </div>
    </div>
  );
}
