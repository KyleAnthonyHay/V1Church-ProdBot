import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  getViewportForBounds,
  type ReactFlowInstance,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import {
  GROUP_COLORS,
  GROUP_LABELS,
  type WiringGraph,
  type WiringNode,
  type WiringEdge,
} from "@shared/wiring";
import type { Pitfall } from "@shared/docs";
import { Badge } from "@/components/ui/badge";

const NODE_W = 200;
const NODE_H = 58;
const CLUSTER_LABEL_H = 28;

type DeviceData = {
  node: WiringNode;
  color: string;
  highlighted: boolean;
  selected: boolean;
};
type ClusterData = { label: string; color: string };

type DeviceNodeType = Node<DeviceData, "device">;
type ClusterNodeType = Node<ClusterData, "cluster">;

function DeviceNode({ data }: NodeProps<DeviceNodeType>) {
  const { node, color, highlighted, selected } = data;
  return (
    <div
      className="bg-card rounded-lg border px-3 py-2 shadow-sm"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderColor: selected ? "#fff" : highlighted ? "#f59e0b" : color,
        borderWidth: highlighted || selected ? 2 : 1,
        boxShadow: highlighted ? "0 0 0 3px rgba(245,158,11,0.25)" : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground"
      />
      <div className="truncate text-sm font-medium">{node.label}</div>
      <div className="text-muted-foreground truncate text-xs">
        {node.model ?? node.type}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground"
      />
    </div>
  );
}

function ClusterNode({ data }: NodeProps<ClusterNodeType>) {
  return (
    <div
      className="h-full w-full rounded-xl"
      style={{
        background: `${data.color}12`,
        border: `1px solid ${data.color}55`,
      }}
    >
      <div
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
        style={{ color: data.color }}
      >
        {data.label}
      </div>
    </div>
  );
}

const nodeTypes = { device: DeviceNode, cluster: ClusterNode };

function layout(
  graph: WiringGraph,
  highlightIds: Set<string>,
  selectedId: string | null,
) {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: "LR",
    nodesep: 24,
    ranksep: 110,
    marginx: 16,
    marginy: 16,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(graph.nodes.map((n) => n.id));
  const groups = [...new Set(graph.nodes.map((n) => n.group))];
  for (const grp of groups) g.setNode(`g:${grp}`, { label: grp });
  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
    g.setParent(n.id, `g:${n.group}`);
  }
  graph.edges.forEach((e) => {
    if (ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
      g.setEdge(e.from, e.to);
  });
  dagre.layout(g);

  const rfNodes: Node[] = [];
  const clusterPos = new Map<string, { x: number; y: number }>();
  for (const grp of groups) {
    const c = g.node(`g:${grp}`);
    if (!c) continue;
    const x = c.x - c.width / 2;
    const y = c.y - c.height / 2 - CLUSTER_LABEL_H;
    clusterPos.set(grp, { x, y });
    rfNodes.push({
      id: `g:${grp}`,
      type: "cluster",
      position: { x, y },
      data: { label: GROUP_LABELS[grp], color: GROUP_COLORS[grp] },
      style: { width: c.width, height: c.height + CLUSTER_LABEL_H },
      selectable: false,
      draggable: false,
      zIndex: -1,
    } satisfies ClusterNodeType);
  }
  for (const n of graph.nodes) {
    const p = g.node(n.id);
    const c = clusterPos.get(n.group) ?? { x: 0, y: 0 };
    rfNodes.push({
      id: n.id,
      type: "device",
      parentId: `g:${n.group}`,
      extent: "parent",
      position: { x: p.x - NODE_W / 2 - c.x, y: p.y - NODE_H / 2 - c.y },
      data: {
        node: n,
        color: GROUP_COLORS[n.group],
        highlighted: highlightIds.has(n.id),
        selected: selectedId === n.id,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
    } satisfies DeviceNodeType);
  }
  const rfEdges: Edge[] = graph.edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e, i) => {
      const dim = selectedId && e.from !== selectedId && e.to !== selectedId;
      return {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        label: e.port ? `${e.signal} · ${e.port}` : e.signal,
        labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
        labelBgStyle: { fill: "var(--background)", fillOpacity: 0.85 },
        labelBgPadding: [4, 2] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke: dim ? "#3f3f46" : "#94a3b8",
          strokeWidth: dim ? 1 : 1.5,
          opacity: dim ? 0.5 : 1,
        },
      };
    });
  return { nodes: rfNodes, edges: rfEdges };
}

export interface HoverInfo {
  node: WiringNode;
  x: number;
  y: number;
}

export function WiringDiagram({
  graph,
  pitfalls = [],
  highlightIds = [],
  selectedId = null,
  onSelect,
  className,
}: {
  graph: WiringGraph;
  pitfalls?: Pitfall[];
  highlightIds?: string[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    },
    [exportUrl],
  );
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const highlight = useMemo(() => new Set(highlightIds), [highlightIds]);
  const { nodes, edges } = useMemo(
    () => layout(graph, highlight, selectedId),
    [graph, highlight, selectedId],
  );

  const onEnter: NodeMouseHandler = useCallback((event, node) => {
    if (node.type !== "device") return;
    const data = node.data as DeviceData;
    setHover({ node: data.node, x: event.clientX, y: event.clientY });
  }, []);
  const onMove: NodeMouseHandler = useCallback((event, node) => {
    if (node.type !== "device") return;
    setHover((h) => (h ? { ...h, x: event.clientX, y: event.clientY } : h));
  }, []);
  const onLeave: NodeMouseHandler = useCallback(() => setHover(null), []);
  const onClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      if (node.type !== "device") return;
      onSelect?.(selectedId === node.id ? null : node.id);
    },
    [onSelect, selectedId],
  );

  return (
    <div
      ref={container}
      className={className ?? "h-full w-full"}
      style={{ position: "relative" }}
    >
      <button
        className="absolute right-2 top-12 z-10 rounded border bg-background px-2 py-1 text-xs"
        disabled={exporting || !instance || !nodes.length}
        onClick={async () => {
          setExporting(true);
          setExportError("");
          try {
            const viewport = container.current?.querySelector<HTMLElement>(
              ".react-flow__viewport",
            );
            if (!viewport || !instance) throw new Error("Diagram is not ready");
            const { toBlob } = await import("html-to-image");
            const bounds = instance.getNodesBounds(instance.getNodes());
            const transform = getViewportForBounds(
              bounds,
              2400,
              1600,
              0.01,
              2,
              0.15,
            );
            const blob = await toBlob(viewport, {
              backgroundColor: getComputedStyle(document.documentElement)
                .getPropertyValue("--background")
                .trim(),
              width: 2400,
              height: 1600,
              pixelRatio: 1,
              style: {
                width: "2400px",
                height: "1600px",
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
              },
            });
            if (!blob) throw new Error("Could not render the diagram");
            const url = URL.createObjectURL(blob);
            setExportUrl(url);
            const link = document.createElement("a");
            link.href = url;
            link.download = "wiring-diagram.png";
            document.body.append(link);
            link.click();
            link.remove();
          } catch (e) {
            setExportError(e instanceof Error ? e.message : String(e));
          } finally {
            setExporting(false);
          }
        }}
      >
        {exporting ? "Exporting…" : "Export PNG"}
      </button>
      {exportUrl && (
        <a
          className="absolute right-2 top-20 z-10 rounded border bg-background px-2 py-1 text-xs"
          href={exportUrl}
          download="wiring-diagram.png"
        >
          Download PNG
        </a>
      )}
      {exportError && (
        <p
          role="alert"
          className="absolute z-20 bottom-10 right-2 max-w-sm rounded bg-background p-2 text-xs text-destructive"
        >
          {exportError}
        </p>
      )}
      <ReactFlow
        onInit={setInstance}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeMouseEnter={onEnter}
        onNodeMouseMove={onMove}
        onNodeMouseLeave={onLeave}
        onNodeClick={onClick}
        onPaneClick={() => onSelect?.(null)}
        colorMode={
          document.documentElement.classList.contains("dark") ? "dark" : "light"
        }
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {hover && <HoverCard info={hover} graph={graph} pitfalls={pitfalls} />}
    </div>
  );
}

function HoverCard({
  info,
  graph,
  pitfalls,
}: {
  info: HoverInfo;
  graph: WiringGraph;
  pitfalls: Pitfall[];
}) {
  const n = info.node;
  const incoming = graph.edges.filter((e) => e.to === n.id);
  const outgoing = graph.edges.filter((e) => e.from === n.id);
  const related = pitfalls.filter((p) => p.nodes.includes(n.id));
  const channels = [...new Set(incoming.map((e) => e.channel).filter(Boolean))];
  const right = info.x + 360 > window.innerWidth;
  const bottom = info.y + 320 > window.innerHeight;
  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none fixed z-50 w-[340px] rounded-lg border p-3 text-xs shadow-xl"
      style={{
        left: right ? info.x - 352 : info.x + 14,
        top: bottom ? info.y - 300 : info.y + 14,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{n.label}</div>
          <div className="text-muted-foreground font-mono">{n.id}</div>
        </div>
        <Badge
          variant="outline"
          style={{
            borderColor: GROUP_COLORS[n.group],
            color: GROUP_COLORS[n.group],
          }}
        >
          {GROUP_LABELS[n.group]}
        </Badge>
      </div>
      <dl className="mt-2 grid grid-cols-[72px_1fr] gap-x-2 gap-y-1">
        <dt className="text-muted-foreground">Type</dt>
        <dd>{n.type}</dd>
        {n.model && (
          <>
            <dt className="text-muted-foreground">Model</dt>
            <dd>{n.model}</dd>
          </>
        )}
        {n.location && (
          <>
            <dt className="text-muted-foreground">Location</dt>
            <dd>{n.location}</dd>
          </>
        )}
        {channels.length > 0 && (
          <>
            <dt className="text-muted-foreground">Console</dt>
            <dd>{channels.join(", ")}</dd>
          </>
        )}
      </dl>
      {n.notes && (
        <p className="text-muted-foreground mt-2 leading-snug">{n.notes}</p>
      )}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="mt-2 space-y-1">
          {incoming.slice(0, 4).map((e, i) => (
            <EdgeLine key={`i${i}`} edge={e} dir="in" graph={graph} />
          ))}
          {incoming.length > 4 && (
            <div className="text-muted-foreground">
              +{incoming.length - 4} more inputs
            </div>
          )}
          {outgoing.slice(0, 4).map((e, i) => (
            <EdgeLine key={`o${i}`} edge={e} dir="out" graph={graph} />
          ))}
          {outgoing.length > 4 && (
            <div className="text-muted-foreground">
              +{outgoing.length - 4} more outputs
            </div>
          )}
        </div>
      )}
      {related.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <div className="text-muted-foreground mb-1">Known pitfalls</div>
          {related.map((p) => (
            <div key={p.id} className="truncate">
              <span className="font-mono">{p.id}</span> {p.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EdgeLine({
  edge,
  dir,
  graph,
}: {
  edge: WiringEdge;
  dir: "in" | "out";
  graph: WiringGraph;
}) {
  const otherId = dir === "in" ? edge.from : edge.to;
  const other = graph.nodes.find((n) => n.id === otherId);
  return (
    <div className="truncate">
      <span className="text-muted-foreground">
        {dir === "in" ? "← from" : "→ to"}
      </span>{" "}
      {other?.label ?? otherId}{" "}
      <span className="text-muted-foreground">
        ({edge.signal}
        {edge.cable ? `, ${edge.cable}` : ""}
        {edge.port ? `, ${edge.port}` : ""})
      </span>
    </div>
  );
}
