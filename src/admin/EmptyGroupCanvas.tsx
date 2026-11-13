import { useMemo } from "react";
import type { WiringGraph, WiringNode } from "@shared/wiring";
import { WiringDiagram } from "@/components/WiringDiagram";
import { Plus } from "lucide-react";

/**
 * Blank canvas for a device that has no internal wiring yet. A small preview,
 * drawn with the real diagram, shows the device in context (what feeds it and
 * what it feeds, greyed out), and a big "+" adds the first device inside it.
 */
export function EmptyGroupCanvas({
  graph,
  parent,
  onAdd,
}: {
  graph: WiringGraph;
  parent: WiringNode;
  onAdd: () => void;
}) {
  // The device, its direct neighbours, and the connections between them.
  const { preview, dim } = useMemo(() => {
    const edges = graph.edges.filter(
      (e) => e.from === parent.id || e.to === parent.id,
    );
    const ids = new Set<string>([parent.id]);
    for (const e of edges) {
      ids.add(e.from);
      ids.add(e.to);
    }
    const nodes = graph.nodes
      .filter((n) => ids.has(n.id))
      // Strip nesting so the preview is a flat, single-level drawing.
      .map(({ parent: _p, ...n }) => n);
    return {
      preview: { nodes, edges } as WiringGraph,
      dim: [...ids].filter((id) => id !== parent.id),
    };
  }, [graph, parent.id]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div
        className="bg-background h-48 w-full max-w-2xl overflow-hidden rounded-lg border"
        aria-label={`${parent.label} and its neighbours`}
      >
        <WiringDiagram
          graph={preview}
          dimIds={dim}
          minimal
          centerId={parent.id}
        />
      </div>
      <div className="max-w-sm space-y-1">
        <div className="text-sm font-medium">
          You are inside {parent.label}
        </div>
        <p className="text-muted-foreground text-xs">
          Nothing drawn here yet. Describe the flow in the chat, or add the
          first device by hand.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add first device inside ${parent.label}`}
        title="Add a device"
        className="bg-primary text-primary-foreground hover:bg-primary/85 focus-visible:ring-ring/50 inline-flex size-14 items-center justify-center rounded-full shadow-md transition-transform outline-none hover:scale-105 focus-visible:ring-3"
      >
        <Plus className="size-7" />
      </button>
    </div>
  );
}
