import { useMemo, useState } from "react";
import { groupDeviceOptions, type WiringNode } from "@shared/wiring";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

/** Chips shown before "Show all"; picked devices always stay visible. */
const PREVIEW_LIMIT = 12;

/**
 * Toggleable device chips grouped by layer, with a search box. A long
 * diagram shows a short preview until expanded or searched.
 */
export function DeviceChips({
  nodes,
  selected,
  onToggle,
}: {
  nodes: WiringNode[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const searching = query.trim() !== "";
  const groups = useMemo(() => groupDeviceOptions(nodes, query), [nodes, query]);
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) counts.set(n.label, (counts.get(n.label) ?? 0) + 1);
    return counts;
  }, [nodes]);

  // Collapsed: the first PREVIEW_LIMIT devices plus anything already picked.
  const limited = !searching && !expanded && nodes.length > PREVIEW_LIMIT;
  let budget = PREVIEW_LIMIT;
  const shown = groups
    .map((g) => ({
      ...g,
      nodes: limited
        ? g.nodes.filter((n) => budget-- > 0 || selected.includes(n.id))
        : g.nodes,
    }))
    .filter((g) => g.nodes.length > 0);
  const hidden = nodes.length - shown.reduce((sum, g) => sum + g.nodes.length, 0);

  return (
    <div className="space-y-2">
      {nodes.length > PREVIEW_LIMIT && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices"
            aria-label="Search devices"
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent pr-2 pl-8 text-sm outline-none focus-visible:ring-3"
          />
        </div>
      )}
      {shown.map((g) => (
        <div key={g.group} className="space-y-1">
          <div className="text-muted-foreground text-[11px] font-medium">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.nodes.map((n) => {
              const on = selected.includes(n.id);
              const dupe = (labelCounts.get(n.label) ?? 0) > 1;
              return (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={on}
                  title={n.id}
                  onClick={() => onToggle(n.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {n.label}
                  {dupe && (
                    <span className="ml-1 font-mono opacity-60">{n.id}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {searching && shown.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No devices match "{query.trim()}".
        </p>
      )}
      {!searching && nodes.length > PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        >
          {expanded ? "Show fewer" : `Show all ${nodes.length} devices (${hidden} more)`}
        </button>
      )}
    </div>
  );
}
