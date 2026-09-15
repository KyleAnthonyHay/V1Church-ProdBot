import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ancestorsOf, type WiringGraph } from "@shared/wiring";
import type { Pitfall } from "@shared/docs";
import { WiringEditor, selectionLevel, type Selection } from "./WiringEditor";
import { cn } from "@/lib/utils";
import { ChevronRight, Layers } from "lucide-react";

/**
 * Full-screen wiring workspace: the canvas on the left, and on the right a
 * chat that redraws the diagram from a description plus the form for the
 * selected device. Opens on the whole campus, or focused inside one device
 * (`parentId`). The header breadcrumb navigates between levels; Cancel or
 * Escape leaves.
 */
export function WiringWorkspace({
  campusId,
  graph,
  parentId = null,
  initialSelection = null,
  pitfalls,
  onSave,
  onClose,
}: {
  campusId: Id<"campuses"> | undefined;
  graph: WiringGraph;
  /** Start inside this device's internal wiring; null for the whole campus. */
  parentId?: string | null;
  /** Open the device form on this (from clicking the preview). */
  initialSelection?: Selection | null;
  pitfalls: Pitfall[];
  onSave: (graph: WiringGraph) => Promise<void>;
  onClose: () => void;
}) {
  const campuses = useQuery(api.campuses.list);
  const campusName =
    campuses?.find((c) => c._id === campusId)?.name ?? "Campus";
  const [focus, setFocus] = useState<string | null>(
    () => parentId ?? selectionLevel(graph, initialSelection),
  );
  // The editor owns the working graph; we only need names for the crumbs.
  const [working, setWorking] = useState(graph);
  // Escape is handled by the editor, which asks before dropping unsaved work.
  if (parentId && !graph.nodes.some((n) => n.id === parentId)) return null;

  const trail = focus ? ancestorsOf(working, focus) : [];
  const current = focus ? working.nodes.find((n) => n.id === focus) : undefined;

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Layers className="text-muted-foreground size-4" />
        <nav className="flex items-center gap-1 text-sm" aria-label="Location">
          <Crumb active={!focus} onClick={() => setFocus(null)}>
            {campusName} wiring
          </Crumb>
          {trail.map((n) => (
            <span key={n.id} className="flex items-center gap-1">
              <ChevronRight className="text-muted-foreground size-3.5" />
              <Crumb onClick={() => setFocus(n.id)}>{n.label}</Crumb>
            </span>
          ))}
          {current && (
            <span className="flex items-center gap-1">
              <ChevronRight className="text-muted-foreground size-3.5" />
              <Crumb active>Inside {current.label}</Crumb>
            </span>
          )}
        </nav>
      </header>
      <div className="min-h-0 flex-1 p-3">
        <WiringEditor
          initial={graph}
          pitfalls={pitfalls}
          initialSelection={initialSelection}
          initialFocus={parentId}
          assistant={{ campusId }}
          fill
          focus={focus}
          onFocusChange={setFocus}
          onGraphChange={setWorking}
          onCancel={onClose}
          onSave={async (g) => {
            await onSave(g);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

function Crumb({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!onClick || active}
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      className={cn(
        "rounded px-1.5 py-0.5 transition-colors",
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
