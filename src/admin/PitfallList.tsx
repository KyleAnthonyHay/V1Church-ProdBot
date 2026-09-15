import { useState } from "react";
import { parsePitfallDetails } from "@shared/docs";
import { toCsv } from "@shared/csv";
import { downloadCsv } from "@/lib/download";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDeleteButton,
  REVEAL_ON_HOVER,
} from "@/components/ConfirmDeleteButton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, Download, Pencil, Search } from "lucide-react";

/**
 * Approved pitfalls as title / description / solution cards, with a search
 * by title or id over a scrolling list, so a long list never grows the page.
 */
export function PitfallList({
  content,
  onEdit,
  onDelete,
}: {
  content: string;
  onEdit: (id: string) => void;
  /** Remove one pitfall from the saved document (asked to confirm first). */
  onDelete?: (id: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const { pitfalls } = parsePitfallDetails(content);
  const q = query.trim().toLowerCase();
  const shown = q
    ? pitfalls.filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
      )
    : pitfalls;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search pitfalls by name"
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          disabled={pitfalls.length === 0}
          onClick={() =>
            downloadCsv(
              toCsv(
                ["ID", "Title", "Issue", "Check", "Solution", "Devices", "Last seen"],
                pitfalls.map((p) => [
                  p.id,
                  p.title,
                  p.issue,
                  p.check.join("\n"),
                  p.solution,
                  p.nodes.join(", "),
                  p.lastSeen ?? "",
                ]),
              ),
              "pitfalls.csv",
            )
          }
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>
      {pitfalls.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="size-5" />}>
          No pitfalls yet. Fill in the fields above to add the first one.
        </EmptyState>
      ) : (
      <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {shown.length === 0 && (
          <p className="text-muted-foreground px-1 py-6 text-center text-sm">
            No pitfalls match "{query.trim()}".
          </p>
        )}
        {shown.map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onEdit(p.id)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(p.id);
              }
            }}
            className="bg-background hover:border-ring/50 group cursor-pointer space-y-2 rounded-lg border p-3 text-left text-sm transition-colors"
          >
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">
                {p.id}
              </Badge>
              <span className="min-w-0 flex-1 font-medium">{p.title}</span>
              <Pencil
                className={cn(
                  "text-muted-foreground mt-2 size-3.5 shrink-0",
                  REVEAL_ON_HOVER,
                )}
              />
              {onDelete && (
                <ConfirmDeleteButton
                  className={REVEAL_ON_HOVER}
                  what={`${p.id}: ${p.title}`}
                  description="This removes the pitfall from the approved pitfalls. The previous version stays in History."
                  onConfirm={() => onDelete(p.id)}
                />
              )}
            </div>
            <Row label="Issue" text={p.issue} />
            <Row label="Solution" text={p.solution} />
            {p.nodes.length > 0 && (
              <div className="text-muted-foreground text-xs">
                Devices: {p.nodes.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="line-clamp-3 whitespace-pre-line">
        {text || <em className="text-muted-foreground">not filled in</em>}
      </span>
    </div>
  );
}
