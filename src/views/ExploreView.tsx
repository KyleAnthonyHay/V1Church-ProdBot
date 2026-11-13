import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Campus } from "@/App";
import { parseWiringYaml } from "@shared/wiring";
import { parsePitfalls } from "@shared/docs";
import { WiringExplorer } from "@/components/WiringExplorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network } from "lucide-react";

/** Explore: the campus wiring diagram, full height. */
export function ExploreView({ campus }: { campus: Campus }) {
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const wiringText = docs?.find((d) => d.kind === "wiring")?.content ?? "";
  const pitfallsText = docs?.find((d) => d.kind === "pitfalls")?.content ?? "";
  const wiring = useMemo(() => parseWiringYaml(wiringText), [wiringText]);
  const pitfalls = useMemo(() => parsePitfalls(pitfallsText), [pitfallsText]);
  const selectedNode = wiring.graph?.nodes.find((n) => n.id === selected);

  if (docs === undefined) return null;

  return (
    <div
      className={
        fullscreen
          ? "bg-background fixed inset-0 z-50 flex flex-col"
          : "flex h-full flex-col"
      }
    >
      <div className="bg-background flex flex-wrap items-center gap-2 border-b p-2">
        <Input
          className="max-w-xs"
          aria-label="Search devices"
          placeholder="Search device name, id or model"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen((s) => !s)}
        >
          {fullscreen ? "Exit fullscreen" : "Fullscreen"}
        </Button>
        {selectedNode && (
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            Focused on {selectedNode.label} · clear
          </Button>
        )}
        {search.trim() && (
          <div className="flex w-full flex-wrap gap-1">
            {wiring.graph?.nodes
              .filter((n) =>
                `${n.id} ${n.label} ${n.model ?? ""}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .slice(0, 20)
              .map((n) => (
                <Button
                  key={n.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelected(n.id);
                    setFocus(n.parent ?? null);
                    setSearch("");
                  }}
                >
                  {n.label}
                </Button>
              ))}
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {wiring.graph ? (
          <>
            <WiringExplorer
              graph={wiring.graph}
              pitfalls={pitfalls}
              selectedId={selected}
              onSelect={setSelected}
              focus={focus}
              onFocusChange={setFocus}
            />
            <div className="text-muted-foreground pointer-events-none absolute right-2 bottom-2 text-[11px]">
              {wiring.graph.nodes.length} devices ·{" "}
              {wiring.graph.edges.length} connections · hover for
              details, click to focus, double-click a device marked "inside"
              for its internal wiring
            </div>
            {wiring.issues.length > 0 && (
              <div className="absolute top-10 right-2 max-w-sm rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                {wiring.issues.length} wiring issue(s):{" "}
                {wiring.issues.slice(0, 3).join("; ")}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
            <Network className="size-8" />
            <p>No wiring documented for {campus.name} yet.</p>
            {wiring.issues.length > 0 ? (
              <p className="max-w-md text-center text-xs">
                The wiring YAML has errors: {wiring.issues[0]}
              </p>
            ) : (
              <p className="max-w-md text-center text-xs">
                Admins add it under Admin → Wiring diagram.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
