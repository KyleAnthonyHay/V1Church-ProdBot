import { parsePitfallDetails } from "@shared/docs";
import { Badge } from "@/components/ui/badge";
import {
  ConfirmDeleteButton,
  REVEAL_ON_HOVER,
} from "@/components/ConfirmDeleteButton";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

/** Approved pitfalls shown as title / description / solution cards. */
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
  const { pitfalls } = parsePitfallDetails(content);
  if (pitfalls.length === 0) return null;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {pitfalls.map((p) => (
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
