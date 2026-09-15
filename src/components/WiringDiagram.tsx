import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  getViewportForBounds,
  useReactFlow,
  useStore,
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
import {
  GROUP_COLORS,
  GROUP_LABELS,
  cableLabel,
  viewGraph,
  type WiringGraph,
  type WiringNode,
  type WiringEdge,
  type WiringView,
} from "@shared/wiring";
import { layoutWiring, type LayoutMetrics } from "@shared/wiringLayout";
import type { Pitfall } from "@shared/docs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NODE_W = 200;
const NODE_H = 58;
const CLUSTER_LABEL_H = 28;
const CLUSTER_PAD_X = 56;
const CLUSTER_PAD_Y = 16;
/**
 * Sizes the layout works from. Boxes grow with their contents and are placed
 * so they never overlap, so these only set the spacing.
 */
const METRICS: LayoutMetrics = {
  nodeW: NODE_W,
  nodeH: NODE_H,
  nodeGap: 14,
  // Wider than two box paddings plus a gap, so boxes in neighbouring columns
  // never touch and connection labels between them have room.
  colGap: 2 * CLUSTER_PAD_X + 64,
  padX: CLUSTER_PAD_X,
  padY: CLUSTER_PAD_Y,
  labelH: CLUSTER_LABEL_H,
  boxGap: 40,
};

type DeviceData = {
  node: WiringNode;
  color: string;
  highlighted: boolean;
  selected: boolean;
  /** Devices nested inside this one (double-click opens them). */
  childCount: number;
  /** Drawn as a placeholder for something outside the current sub-diagram. */
  external: boolean;
  /** Greyed out: context only (used by the empty sub-diagram preview). */
  dimmed: boolean;
  /** Set on outside devices in a sub-diagram: which way they connect to it. */
  port?: DevicePort;
  actions?: NodeActions;
};

type DevicePort = {
  direction: "in" | "out" | "both";
  /** For a connection attached to the group itself: click selects that edge. */
  edgeIndex?: number;
  detail: string;
};

/** Optional per-device buttons shown on hover (admin only). */
export type NodeActions = {
  edit?: (id: string) => void;
  addInternal?: (id: string) => void;
  /**
   * Plus handle on a device's side. "right": a new device this one feeds
   * (id → new). "left": a new device that feeds this one (new → id).
   */
  addNeighbor?: (id: string, side: "left" | "right") => void;
  /** Plus on a dangling port: add a device inside and attach that connection to it. */
  attachDangling?: (edgeIndex: number) => void;
};
type ClusterData = {
  label: string;
  color: string;
  /** Sub-diagram only: the viewed device's input/output tab on this box. */
  inLabel?: string;
  outLabel?: string;
};
const BOX_PORT_W = 150;

type DeviceNodeType = Node<DeviceData, "device">;
type ClusterNodeType = Node<ClusterData, "cluster">;

function DeviceNode({ data }: NodeProps<DeviceNodeType>) {
  const {
    node,
    color,
    highlighted,
    selected,
    childCount,
    external,
    dimmed,
    port,
    actions,
  } = data;
  const sides = actions?.addNeighbor && !external;
  // Outside devices: the "+" goes on the side facing the group, where a new
  // inside device would sit.
  const portAdd =
    port &&
    (port.edgeIndex !== undefined
      ? !!actions?.attachDangling
      : !!actions?.addNeighbor);
  const addFromPort = (side: "left" | "right") => {
    if (port?.edgeIndex !== undefined) actions?.attachDangling?.(port.edgeIndex);
    else actions?.addNeighbor?.(node.id, side);
  };
  return (
    <div
      // Hover: a soft ring in the group colour, lighter than the selected one.
      className="bg-card group/node relative rounded-lg border px-3 py-2 shadow-sm transition-shadow hover:shadow-[0_0_0_3px_var(--node-hover)]"
      title={
        port
          ? port.detail
          : childCount > 0
            ? `Double-click to open ${node.label} (${childCount} inside)`
            : actions && !external
              ? `Double-click to add internal wiring to ${node.label}`
              : undefined
      }
      style={{
        width: NODE_W,
        height: NODE_H,
        ...({ "--node-hover": `${color}33` } as React.CSSProperties),
        // Selected: the group colour at full strength plus a soft ring, so it
        // reads as selected in light and dark themes. Unselected is paler.
        borderColor: highlighted ? "#f59e0b" : selected ? color : `${color}80`,
        borderWidth: highlighted || selected ? 2 : 1,
        cursor: port?.edgeIndex !== undefined ? "pointer" : undefined,
        opacity: dimmed ? 0.45 : 1,
        filter: dimmed ? "grayscale(1)" : undefined,
        boxShadow: highlighted
          ? "0 0 0 3px rgba(245,158,11,0.25)"
          : selected
            ? `0 0 0 3px ${color}40`
            : undefined,
      }}
    >
      {childCount > 0 && (
        <span
          className="absolute -top-2 right-2 rounded-full border px-1.5 text-[10px] font-medium"
          style={{ background: "var(--card)", borderColor: color, color }}
        >
          {childCount} inside ▸
        </span>
      )}
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
      {sides && (
        <>
          <SidePlus
            side="left"
            label={`Add a device that feeds ${node.label}`}
            onClick={() => actions!.addNeighbor!(node.id, "left")}
          />
          <SidePlus
            side="right"
            label={`Add a device ${node.label} feeds`}
            onClick={() => actions!.addNeighbor!(node.id, "right")}
          />
        </>
      )}
      {portAdd && port.direction !== "out" && (
        <SidePlus
          side="right"
          label={
            port.edgeIndex !== undefined
              ? `Add a device inside fed by the input from ${node.label}`
              : `Add a device inside that ${node.label} feeds`
          }
          onClick={() => addFromPort("right")}
        />
      )}
      {portAdd && port.direction !== "in" && (
        <SidePlus
          side="left"
          label={
            port.edgeIndex !== undefined
              ? `Add a device inside that feeds the output to ${node.label}`
              : `Add a device inside that feeds ${node.label}`
          }
          onClick={() => addFromPort("left")}
        />
      )}
    </div>
  );
}

/**
 * Round "+" hanging off a node's left or right edge. Hidden until the node is
 * hovered or the button itself has focus, so the diagram stays clean.
 */
function SidePlus({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={
        "bg-primary text-primary-foreground nodrag nopan absolute top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-background opacity-0 shadow-md transition-opacity group-hover/node:opacity-100 hover:scale-110 focus-visible:opacity-100" +
        (side === "left" ? " -left-3.5" : " -right-3.5")
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
    </button>
  );
}

/**
 * Fit the view once nodes are measured, and again when the node set or the
 * container changes. With `centerId`, that device sits at the horizontal
 * centre and the zoom is chosen so everything on either side still fits.
 */
function FitOnReady({
  nodeCount,
  centerId,
  tick,
}: {
  nodeCount: number;
  centerId?: string;
  tick: number;
}) {
  // useNodesInitialized also waits for handle bounds, which cluster nodes never
  // get; measured sizes are all the fit needs.
  // Measured sizes live on the internal nodes (nodeLookup), not the props.
  const ready = useStore((s) => {
    if (s.nodeLookup.size === 0) return false;
    for (const n of s.nodeLookup.values()) if (!n.measured?.width) return false;
    return true;
  });
  const { fitView, setViewport, getNodes, getInternalNode } = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  // `ready` briefly drops to false whenever the node objects are replaced
  // (React Flow re-measures them). Only refit when something that actually
  // affects the fit has changed since the last one, so a plain re-render
  // never throws away the user's pan and zoom.
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const key = [nodeCount, tick, centerId ?? "", width, height].join("|");
    if (lastFit.current === key) return;
    const id = requestAnimationFrame(() => {
      // Recorded here, not above: if the frame is cancelled by a re-measure
      // the next ready pass still gets to fit.
      lastFit.current = key;
      const target = centerId ? getInternalNode(centerId) : undefined;
      if (!target || !width || !height) {
        void fitView({ padding: 0.15 });
        return;
      }
      const pad = 24;
      const tw = target.measured.width ?? NODE_W;
      const th = target.measured.height ?? NODE_H;
      const cx = target.internals.positionAbsolute.x + tw / 2;
      const cy = target.internals.positionAbsolute.y + th / 2;
      let reachX = tw / 2;
      let top = cy;
      let bottom = cy;
      for (const n of getNodes()) {
        const inner = getInternalNode(n.id);
        if (!inner) continue;
        const w = inner.measured.width ?? (n.width as number) ?? NODE_W;
        const h = inner.measured.height ?? (n.height as number) ?? NODE_H;
        const x = inner.internals.positionAbsolute.x;
        const y = inner.internals.positionAbsolute.y;
        reachX = Math.max(reachX, Math.abs(x - cx), Math.abs(x + w - cx));
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + h);
      }
      const zoom = Math.min(
        1,
        (width / 2 - pad) / reachX,
        (height - 2 * pad) / (bottom - top),
      );
      const midY = (top + bottom) / 2;
      void setViewport({
        x: width / 2 - cx * zoom,
        y: height / 2 - midY * zoom,
        zoom,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [
    ready,
    nodeCount,
    tick,
    centerId,
    width,
    height,
    fitView,
    setViewport,
    getNodes,
    getInternalNode,
  ]);
  return null;
}

function BoxPort({
  side,
  label,
  color,
}: {
  side: "left" | "right";
  label: string;
  color: string;
}) {
  const out = side === "right";
  return (
    <div
      className={
        "bg-card absolute top-1/2 flex h-6 -translate-y-1/2 items-center gap-1 border px-2 text-[10px] " +
        (out ? "left-full rounded-r-full border-l-0" : "right-full rounded-l-full border-r-0 justify-end")
      }
      style={{ width: BOX_PORT_W, borderColor: `${color}88`, color }}
      title={out ? `Leaves through the output of ${label}` : `Enters through the input of ${label}`}
    >
      <span className="font-semibold uppercase tracking-wide">{out ? "out" : "in"}</span>
      <span className="text-muted-foreground truncate">
        {out ? "of" : "to"} {label}
      </span>
      {/* Outer end: the outside device. Inner end: devices inside the group. */}
      <Handle
        id={out ? "out" : "in"}
        type={out ? "source" : "target"}
        position={out ? Position.Right : Position.Left}
        className="!bg-muted-foreground"
      />
      <Handle
        id={out ? "out-inner" : "in-inner"}
        type={out ? "target" : "source"}
        position={out ? Position.Left : Position.Right}
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
      {/* Connections to the group as a whole enter and leave through tabs on
          the box edge, named after the device being viewed. */}
      {data.inLabel ? (
        <BoxPort side="left" label={data.inLabel} color={data.color} />
      ) : (
        <Handle id="in" type="target" position={Position.Left} className="!opacity-0" />
      )}
      {data.outLabel ? (
        <BoxPort side="right" label={data.outLabel} color={data.color} />
      ) : (
        <Handle id="out" type="source" position={Position.Right} className="!opacity-0" />
      )}
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

function edgeStyle(active: boolean, dim: boolean) {
  return {
    labelStyle: {
      fontSize: 10,
      fill: active ? "var(--foreground)" : "var(--muted-foreground)",
    },
    labelBgStyle: { fill: "var(--background)", fillOpacity: 0.85 },
    labelBgPadding: [4, 2] as [number, number],
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    style: {
      stroke: active ? "#f59e0b" : dim ? "#3f3f46" : "#94a3b8",
      strokeWidth: active ? 2.5 : dim ? 1 : 1.5,
      opacity: dim && !active ? 0.5 : 1,
    },
  };
}

function layout(
  graph: WiringView,
  highlightIds: Set<string>,
  selectedId: string | null,
  selectedEdge: number | null,
  actions: NodeActions | undefined,
  dimIds: Set<string>,
  /** Label of the device whose sub-diagram this is. */
  focusLabel?: string,
) {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const inner = graph.nodes.filter((n) => !graph.external.has(n.id));
  const outer = graph.nodes.filter((n) => graph.external.has(n.id));
  const placed = layoutWiring(graph, METRICS);

  const device = (
    id: string,
    n: WiringNode,
    position: { x: number; y: number },
    extra: Partial<DeviceData> & { parentId?: string } = {},
  ): DeviceNodeType => {
    const { parentId, ...data } = extra;
    return {
      id,
      type: "device",
      ...(parentId ? { parentId, extent: "parent" as const } : {}),
      // Known size up front so fitView is right before the DOM is measured.
      width: NODE_W,
      height: NODE_H,
      position,
      data: {
        node: n,
        color: GROUP_COLORS[n.group],
        highlighted: highlightIds.has(n.id),
        selected: selectedId === n.id,
        childCount: graph.childCount.get(n.id) ?? 0,
        external: false,
        dimmed: dimIds.has(n.id),
        actions,
        ...data,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
    };
  };

  const rfNodes: Node[] = [];
  const clusters: { id: string; x: number; y: number; w: number }[] = [];
  const clusterPos = new Map<string, { x: number; y: number }>();
  for (const box of placed.boxes) {
    const { group: grp, x, y, w, h } = box;
    clusterPos.set(grp, { x, y });
    clusters.push({ id: `g:${grp}`, x, y, w });
    rfNodes.push({
      id: `g:${grp}`,
      type: "cluster",
      position: { x, y },
      data: { label: GROUP_LABELS[grp], color: GROUP_COLORS[grp] },
      width: w,
      height: h,
      style: { width: w, height: h },
      selectable: false,
      draggable: false,
      zIndex: -1,
    } satisfies ClusterNodeType);
  }
  const outDir = (id: string): DevicePort["direction"] => {
    const into = graph.edges.some((e) => e.to === id);
    const from = graph.edges.some((e) => e.from === id);
    return into && from ? "both" : into ? "out" : "in";
  };
  for (const n of outer) {
    const p = placed.nodes.get(n.id) ?? { x: 0, y: 0 };
    rfNodes.push(
      device(
        n.id,
        n,
        { x: p.x, y: p.y },
        {
          external: true,
          port: {
            direction: outDir(n.id),
            detail: `${n.label} is outside this group`,
          },
        },
      ),
    );
  }
  for (const n of inner) {
    const p = placed.nodes.get(n.id) ?? { x: 0, y: 0 };
    const c = clusterPos.get(n.group) ?? { x: 0, y: 0 };
    rfNodes.push(
      device(
        n.id,
        n,
        { x: p.x - c.x, y: p.y - c.y },
        { parentId: `g:${n.group}` },
      ),
    );
  }
  const rfEdges: Edge[] = graph.edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => {
      const dim = !!selectedId && e.from !== selectedId && e.to !== selectedId;
      return {
        id: `e${e.index}`,
        source: e.from,
        target: e.to,
        label: [e.signal, cableLabel(e), e.port].filter(Boolean).join(" · "),
        ...edgeStyle(selectedEdge === e.index, dim),
      };
    });
  // Connections attached to the group itself, with nothing inside wired to
  // them yet: the outside device as a card, with an arrow to or from the group
  // box. Incoming on the left, outgoing on the right, stacked and centred.
  if (graph.dangling.length || graph.ports.length) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of rfNodes) {
      if (n.parentId) continue;
      minX = Math.min(minX, n.position.x);
      maxX = Math.max(maxX, n.position.x + ((n.width as number) ?? NODE_W));
      minY = Math.min(minY, n.position.y);
      maxY = Math.max(maxY, n.position.y + ((n.height as number) ?? NODE_H));
    }
    if (!Number.isFinite(minX)) {
      minX = maxX = 0;
      minY = maxY = NODE_H;
    }
    const midY = (minY + maxY) / 2;
    const gap = 12;
    const stackTop = (count: number) =>
      midY - (count * NODE_H + (count - 1) * gap) / 2;
    const ins = graph.dangling.filter((e) => !e.outgoing).length;
    let leftY = stackTop(ins);
    let rightY = stackTop(graph.dangling.length - ins);
    // The box nearest each side receives the arrow.
    const sorted = [...clusters].sort((a, b) => a.x - b.x);
    const leftBox = sorted[0];
    const rightBox = sorted.at(-1);
    const name = focusLabel ?? "this device";
    const tab = (box: typeof leftBox | undefined, key: "inLabel" | "outLabel") => {
      const n = rfNodes.find((r) => r.id === box?.id) as ClusterNodeType | undefined;
      if (n) n.data = { ...n.data, [key]: name };
    };
    if (ins > 0 || graph.ports.some((p) => !p.toOut)) tab(leftBox, "inLabel");
    if (graph.dangling.length > ins || graph.ports.some((p) => p.toOut))
      tab(rightBox, "outLabel");
    // Devices wired to the group's own input/output: IN tab -> device -> OUT tab.
    for (const p of graph.ports) {
      const box = p.toOut ? rightBox : leftBox;
      if (!box || !ids.has(p.nodeId)) continue;
      rfEdges.push({
        id: `e${p.index}`,
        source: p.toOut ? p.nodeId : box.id,
        target: p.toOut ? box.id : p.nodeId,
        ...(p.toOut
          ? { targetHandle: "out-inner" }
          : { sourceHandle: "in-inner" }),
        label: [p.signal, cableLabel(p), p.port].filter(Boolean).join(" · "),
        ...edgeStyle(selectedEdge === p.index, false),
      });
    }
    for (const e of graph.dangling) {
      const outgoing = e.outgoing;
      const y = outgoing ? rightY : leftY;
      if (outgoing) rightY += NODE_H + gap;
      else leftY += NODE_H + gap;
      const id = `port:e${e.index}`;
      const other: WiringNode = e.other ?? {
        id: e.otherId,
        label: e.otherLabel,
        type: "other",
        group: "other",
      };
      const signal = [e.signal, cableLabel(e)].filter(Boolean).join(" · ");
      rfNodes.push(
        device(
          id,
          other,
          {
            x: outgoing
              ? maxX + BOX_PORT_W + 110
              : minX - NODE_W - BOX_PORT_W - 110,
            y,
          },
          {
            external: true,
            childCount: graph.childCount.get(e.otherId) ?? 0,
            selected: selectedEdge === e.index,
            port: {
              direction: outgoing ? "out" : "in",
              edgeIndex: e.index,
              detail: `${signal} ${outgoing ? "leaves" : "enters"} the group but is not wired to a device inside yet. Click to attach it.`,
            },
          },
        ),
      );
      const box = outgoing ? rightBox : leftBox;
      if (!box) continue;
      rfEdges.push({
        id: `e${e.index}`,
        source: outgoing ? box.id : id,
        target: outgoing ? id : box.id,
        ...(outgoing ? { sourceHandle: "out" } : { targetHandle: "in" }),
        label: [e.signal, cableLabel(e), e.port].filter(Boolean).join(" · "),
        ...edgeStyle(selectedEdge === e.index, false),
      });
    }
  }
  return { nodes: rfNodes, edges: rfEdges };
}

export interface HoverInfo {
  node: WiringNode;
  x: number;
  y: number;
}

// Stable defaults: a fresh `[]` per render would rebuild every React Flow
// node object, which resets their measurements and refits the view.
const NO_PITFALLS: Pitfall[] = [];
const NO_IDS: string[] = [];

export function WiringDiagram({
  graph,
  pitfalls = NO_PITFALLS,
  highlightIds = NO_IDS,
  selectedId = null,
  onSelect,
  selectedEdge = null,
  onSelectEdge,
  focus = null,
  onOpen,
  nodeActions,
  dimIds,
  minimal = false,
  centerId,
  className,
  onExportReady,
}: {
  /**
   * Host renders its own Export PNG button: receives the export function once
   * the diagram can be exported (null while it cannot), and the button on the
   * canvas is hidden.
   */
  onExportReady?: (exportPng: (() => void) | null) => void;
  graph: WiringGraph;
  pitfalls?: Pitfall[];
  highlightIds?: string[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Index into graph.edges of the highlighted connection. */
  selectedEdge?: number | null;
  onSelectEdge?: (index: number | null) => void;
  /** id of the node whose sub-diagram is shown; null for the main diagram. */
  focus?: string | null;
  /** Called when a node with nested devices is double-clicked. */
  onOpen?: (id: string) => void;
  /** Hover buttons on each device (edit, add internal wiring). */
  nodeActions?: NodeActions;
  /** Devices drawn greyed out, for context. */
  dimIds?: string[];
  /** Static preview: no controls, export, or pan/zoom. */
  minimal?: boolean;
  /** Keep this device at the horizontal centre instead of fitting the bounds. */
  centerId?: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  // Follow the app theme live (the toggle flips the "dark" class on <html>).
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
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
  const view = useMemo(() => viewGraph(graph, focus), [graph, focus]);
  const dim = useMemo(() => new Set(dimIds ?? []), [dimIds]);
  // Refit when the container changes size (panels opening, overlays).
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => setResizeTick((t) => t + 1));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const focusLabel = useMemo(
    () => (focus ? graph.nodes.find((n) => n.id === focus)?.label : undefined),
    [graph, focus],
  );
  const { nodes, edges } = useMemo(
    () =>
      layout(
        view,
        highlight,
        selectedId,
        selectedEdge,
        nodeActions,
        dim,
        focusLabel,
      ),
    [view, highlight, selectedId, selectedEdge, nodeActions, dim, focusLabel],
  );

  const onEnter: NodeMouseHandler = useCallback((event, node) => {
    if (node.type !== "device" || minimal) return;
    const data = node.data as DeviceData;
    setHover({ node: data.node, x: event.clientX, y: event.clientY });
  }, [minimal]);
  const onMove: NodeMouseHandler = useCallback((event, node) => {
    if (node.type !== "device") return;
    setHover((h) => (h ? { ...h, x: event.clientX, y: event.clientY } : h));
  }, []);
  const onLeave: NodeMouseHandler = useCallback(() => setHover(null), []);
  const onClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      if (node.type !== "device") return;
      const port = (node.data as DeviceData).port;
      if (port) {
        const idx = port.edgeIndex;
        if (idx !== undefined) onSelectEdge?.(selectedEdge === idx ? null : idx);
        return;
      }
      onSelect?.(selectedId === node.id ? null : node.id);
    },
    [onSelect, selectedId, onSelectEdge, selectedEdge],
  );

  async function exportPng() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const viewport = container.current?.querySelector<HTMLElement>(
        ".react-flow__viewport",
      );
      if (!viewport || !instance) throw new Error("Diagram is not ready");
      const { toBlob } = await import("html-to-image");
      const bounds = instance.getNodesBounds(instance.getNodes());
      const transform = getViewportForBounds(bounds, 2400, 1600, 0.01, 2, 0.15);
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
  }
  // Hand a stable export function to a host that shows its own button.
  const exportRef = useRef(exportPng);
  exportRef.current = exportPng;
  const readyRef = useRef(onExportReady);
  readyRef.current = onExportReady;
  const stableExport = useCallback(() => void exportRef.current(), []);
  const canExport = !!instance && nodes.length > 0;
  const hostExport = !!onExportReady;
  useEffect(() => {
    readyRef.current?.(canExport ? stableExport : null);
  }, [canExport, stableExport]);
  useEffect(() => () => readyRef.current?.(null), []);

  return (
    <div
      ref={container}
      className={className ?? "h-full w-full"}
      style={{ position: "relative" }}
    >
      {!minimal && !hostExport && (
        <button
          className="absolute right-2 bottom-2 z-10 rounded border bg-background px-2 py-1 text-xs"
          disabled={exporting || !canExport}
          onClick={() => void exportPng()}
        >
          {exporting ? "Exporting…" : "Export PNG"}
        </button>
      )}
      {exportUrl && (
        <a
          className={cn(
            "absolute right-2 z-10 rounded border bg-background px-2 py-1 text-xs",
            hostExport ? "top-2" : "bottom-10",
          )}
          href={exportUrl}
          download="wiring-diagram.png"
        >
          Download PNG
        </a>
      )}
      {exportError && (
        <p
          role="alert"
          className={cn(
            "absolute right-2 z-20 max-w-sm rounded bg-background p-2 text-xs text-destructive",
            hostExport ? "top-10" : "bottom-[4.5rem]",
          )}
        >
          {exportError}
        </p>
      )}
      <ReactFlowProvider>
      <ReactFlow
        onInit={setInstance}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // With a centre target, FitOnReady positions the view instead.
        fitView={!centerId}
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={!minimal}
        zoomOnScroll={!minimal}
        zoomOnPinch={!minimal}
        zoomOnDoubleClick={false}
        preventScrolling={!minimal}
        onNodeMouseEnter={onEnter}
        onNodeMouseMove={onMove}
        onNodeMouseLeave={onLeave}
        onNodeClick={onClick}
        onNodeDoubleClick={(_e, node) => {
          if (node.type !== "device") return;
          const data = node.data as DeviceData;
          if (data.external) return;
          // A device with nothing inside yet opens straight into adding its
          // internal wiring wherever editing is possible; read-only views
          // (Explore) only open devices that already have some.
          if (data.childCount > 0) onOpen?.(node.id);
          else if (nodeActions?.addInternal) nodeActions.addInternal(node.id);
          else if (nodeActions) onOpen?.(node.id);
        }}
        onEdgeClick={(_e, edge) => {
          if (!onSelectEdge) return;
          const index = Number(edge.id.slice(1));
          onSelectEdge(selectedEdge === index ? null : index);
        }}
        onPaneClick={() => {
          onSelect?.(null);
          onSelectEdge?.(null);
        }}
        colorMode={dark ? "dark" : "light"}
      >
        <Background gap={24} />
        {!minimal && <Controls showInteractive={false} />}
        <FitOnReady
          key={focus ?? "top"}
          nodeCount={view.nodes.length}
          centerId={centerId}
          tick={resizeTick}
        />
      </ReactFlow>
      </ReactFlowProvider>
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
        {edge.cable ? `, ${cableLabel(edge)}` : ""}
        {edge.port ? `, ${edge.port}` : ""})
      </span>
    </div>
  );
}
