import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Campus } from "@/App";
import {
  parseWiringYaml,
  wiringToYaml,
  GROUP_COLORS,
  GROUP_LABELS,
  type NodeGroup,
} from "@shared/wiring";
import { parsePitfalls, DOC_META, type DocKind } from "@shared/docs";
import { WiringDiagram } from "@/components/WiringDiagram";
import { Response } from "@/components/ui/response";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunbookChecklist } from "@/components/RunbookChecklist";
import { Input } from "@/components/ui/input";
import { Network, X } from "lucide-react";

const TAB_KINDS: DocKind[] = [
  "pitfalls",
  "runbook",
  "systems",
  "wiring",
  "links",
  "glossary",
];

export function ExploreView({ campus }: { campus: Campus }) {
  const docs = useQuery(api.documents.listForCampus, { campusId: campus._id });
  const shared = useQuery(api.documents.listForCampus, {});
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
  const [hiddenGroups, setHiddenGroups] = useState<NodeGroup[]>([]);
  const [tab, setTab] = useState("pitfalls");
  const [selected, setSelected] = useState<string | null>(null);

  const byKind = useMemo(() => {
    const m = new Map<DocKind, string>();
    for (const d of docs ?? []) m.set(d.kind, d.content);
    for (const d of shared ?? []) m.set(d.kind, d.content);
    return m;
  }, [docs, shared]);

  const wiring = useMemo(
    () => parseWiringYaml(byKind.get("wiring") ?? ""),
    [byKind],
  );
  const pitfalls = useMemo(
    () => parsePitfalls(byKind.get("pitfalls") ?? ""),
    [byKind],
  );
  const groups = useMemo(
    () => [...new Set(wiring.graph?.nodes.map((n) => n.group) ?? [])],
    [wiring.graph],
  );
  const visibleGraph = useMemo(() => {
    if (!wiring.graph) return null;
    const nodes = wiring.graph.nodes.filter(
      (n) => !hiddenGroups.includes(n.group),
    );
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges: wiring.graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
    };
  }, [wiring.graph, hiddenGroups]);
  const selectedNode = wiring.graph?.nodes.find((n) => n.id === selected);
  const filteredPitfalls = selected
    ? pitfalls.filter((p) => p.nodes.includes(selected))
    : pitfalls;

  if (docs === undefined) return null;

  return (
    <div className="flex h-full flex-col">
      <div
        className={
          fullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col"
            : "border-border relative h-[52%] min-h-[280px] border-b flex flex-col"
        }
      >
        <div className="flex flex-wrap gap-2 border-b bg-background p-2">
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTab("wiring");
                setFullscreen(false);
              }}
            >
              View {selectedNode.id} YAML
            </Button>
          )}
          {search.trim() && (
            <div className="w-full flex flex-wrap gap-1">
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
                      setHiddenGroups((g) => g.filter((v) => v !== n.group));
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
              <WiringDiagram
                graph={visibleGraph ?? wiring.graph}
                pitfalls={pitfalls}
                selectedId={selected}
                onSelect={setSelected}
              />
              <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                {groups.map((g) => (
                  <button
                    key={g}
                    aria-pressed={!hiddenGroups.includes(g)}
                    onClick={() =>
                      setHiddenGroups((groups) =>
                        groups.includes(g)
                          ? groups.filter((v) => v !== g)
                          : [...groups, g],
                      )
                    }
                    style={{
                      borderColor: GROUP_COLORS[g],
                      color: GROUP_COLORS[g],
                      opacity: hiddenGroups.includes(g) ? 0.45 : 1,
                    }}
                    className="bg-background/90 rounded border px-2 py-1 text-xs"
                  >
                    {GROUP_LABELS[g]}
                  </button>
                ))}
              </div>
              <div className="text-muted-foreground pointer-events-none absolute right-2 bottom-2 text-[11px]">
                {visibleGraph?.nodes.length ?? 0} devices ·{" "}
                {visibleGraph?.edges.length ?? 0} connections · hover for
                details, click to focus
              </div>
              {wiring.issues.length > 0 && (
                <div className="absolute top-2 right-2 max-w-sm rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
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
                  Admins add source notes under Admin, then generate the wiring
                  graph.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-border flex items-center gap-3 overflow-x-auto border-b px-3">
          <TabsList className="my-1">
            {TAB_KINDS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {DOC_META[k].title}
                {!byKind.get(k)?.trim() && (
                  <span className="text-muted-foreground ml-1 text-[10px]">
                    empty
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedNode && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelected(null)}
            >
              Focused on {selectedNode.label} <X className="size-3" />
            </Button>
          )}
        </div>
        {TAB_KINDS.map((k) => (
          <TabsContent
            key={k}
            value={k}
            className="min-h-0 flex-1 overflow-y-auto p-4"
          >
            {k === "runbook" && (
              <RunbookChecklist
                campusId={campus._id}
                content={byKind.get("runbook") ?? ""}
              />
            )}
            {k === "wiring" && selectedNode && (
              <div className="mb-3">
                <h3 className="mb-2 text-sm font-medium">
                  Selected device: {selectedNode.label}
                </h3>
                <pre className="rounded border p-3 overflow-x-auto text-xs">
                  {wiringToYaml({
                    nodes: [selectedNode],
                    edges:
                      wiring.graph?.edges.filter(
                        (e) => e.from === selected || e.to === selected,
                      ) ?? [],
                  })}
                </pre>
              </div>
            )}
            {k === "pitfalls" && selected ? (
              filteredPitfalls.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No pitfalls reference {selectedNode?.label}.
                </p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-3xl">
                  {filteredPitfalls.map((p) => (
                    <Response key={p.id}>{p.body}</Response>
                  ))}
                </div>
              )
            ) : (
              <DocBody
                kind={k}
                content={byKind.get(k) ?? ""}
                campusName={campus.name}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function DocBody({
  kind,
  content,
  campusName,
}: {
  kind: DocKind;
  content: string;
  campusName: string;
}) {
  if (!content.trim()) {
    return (
      <p className="text-muted-foreground text-sm">
        {DOC_META[kind].title} is not documented yet
        {kind === "links" || kind === "glossary" ? "" : ` for ${campusName}`}.
      </p>
    );
  }
  if (DOC_META[kind].format === "yaml") {
    return (
      <pre className="bg-muted/40 max-w-4xl overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }
  return (
    <div className="max-w-3xl text-sm">
      <Response>{content}</Response>
    </div>
  );
}
