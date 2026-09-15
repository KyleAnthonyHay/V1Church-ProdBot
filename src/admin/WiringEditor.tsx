import { useEffect, useMemo, useRef, useState } from "react";
import {
  CABLE_FORMATS,
  CABLE_PRESETS,
  GROUP_LABELS,
  cableLabel,
  hasCableFormat,
  NODE_GROUPS,
  NODE_TYPES,
  SIGNAL_TYPES,
  countChildren,
  descendantsOf,
  validateGraph,
  type WiringEdge,
  type WiringGraph,
  type WiringNode,
} from "@shared/wiring";
import type { Pitfall } from "@shared/docs";
import { WiringExplorer } from "@/components/WiringExplorer";
import type { NodeActions } from "@/components/WiringDiagram";
import { WiringChat } from "./WiringChat";
import { EmptyGroupCanvas } from "./EmptyGroupCanvas";
import { DevicePicker } from "./DevicePicker";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRightFromLine,
  ArrowRightToLine,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  ImageDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

/**
 * What a host asks the editor to open on. Devices own their connections, so
 * a connection is opened through the device it belongs to, with that
 * connection expanded in the device's form.
 */
export type Selection =
  | { kind: "node"; id: string }
  | { kind: "edge"; index: number };

/** The device being edited and which of its connections is expanded. */
type Picked = { id: string; edge: number | null };

type Direction = "in" | "out";

const selectClass =
  "border-input h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function slug(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "device"
  );
}
function uniqueId(base: string, taken: Set<string>) {
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}_${n++}`;
  return id;
}
function atLevel(node: WiringNode | undefined, level: string | null) {
  return !!node && (level ? node.parent === level : !node.parent);
}
/**
 * The device a connection is edited under: its source, unless only its
 * destination sits on the current level (the source may be the group itself,
 * or a device outside the group).
 */
function ownerOf(
  graph: WiringGraph,
  index: number,
  level: string | null,
): Picked | null {
  const edge = graph.edges[index];
  if (!edge) return null;
  const from = graph.nodes.find((n) => n.id === edge.from);
  const to = graph.nodes.find((n) => n.id === edge.to);
  if (!from && !to) return null;
  const id = !from
    ? edge.to
    : !to
      ? edge.from
      : atLevel(from, level) || !atLevel(to, level)
        ? edge.from
        : edge.to;
  return { id, edge: index };
}
/** The level to open on: given, or where the selected thing lives. */
export function selectionLevel(
  graph: WiringGraph,
  sel: Selection | null,
  focus: string | null = null,
) {
  if (focus) return focus;
  if (!sel) return null;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  if (sel.kind === "node") return byId.get(sel.id)?.parent ?? null;
  const edge = graph.edges[sel.index];
  if (!edge) return null;
  return byId.get(edge.from)?.parent ?? byId.get(edge.to)?.parent ?? null;
}
/**
 * Cable and signal for a connection between a device inside a group and the
 * group's own IN or OUT: match what already enters or leaves the group.
 */
function groupLink(
  g: WiringGraph,
  group: string,
  into: boolean,
): Pick<WiringEdge, "signal" | "cable"> {
  const inside = descendantsOf(g, group);
  const outside = g.edges.find((e) =>
    into
      ? e.to === group && !inside.has(e.from)
      : e.from === group && !inside.has(e.to),
  );
  return { signal: outside?.signal ?? "analog_line", cable: outside?.cable ?? "XLR" };
}
function newEdge(
  g: WiringGraph,
  level: string | null,
  nodeId: string,
  direction: Direction,
  otherId: string,
): WiringEdge {
  const into = direction === "in";
  const base =
    level && otherId === level
      ? groupLink(g, level, into)
      : { signal: "analog_line" as const, cable: "XLR" };
  return into
    ? { from: otherId, to: nodeId, ...base }
    : { from: nodeId, to: otherId, ...base };
}

/**
 * Click-to-edit wiring diagram. A device is the unit of editing: its form
 * carries its details and the connections in and out of it. Saving hands the
 * whole graph back (the caller turns it into YAML).
 */
export function WiringEditor({
  initial,
  pitfalls = [],
  initialSelection = null,
  initialFocus = null,
  assistant,
  fill = false,
  focus: controlledFocus,
  onFocusChange,
  onGraphChange,
  onSave,
  onCancel,
}: {
  initial: WiringGraph;
  pitfalls?: Pitfall[];
  /** What to open the side form on (from clicking the preview). */
  initialSelection?: Selection | null;
  /** Start inside this device's internal wiring. */
  initialFocus?: string | null;
  /**
   * Show the describe-and-draw chat. It follows the level on the canvas: the
   * whole campus at the top, one device's internal wiring when inside it.
   */
  assistant?: { campusId: Id<"campuses"> | undefined };
  /** Fill the available height (workspace mode) instead of a fixed canvas. */
  fill?: boolean;
  /** Controlled level (workspace mode renders its own breadcrumb). */
  focus?: string | null;
  onFocusChange?: (id: string | null) => void;
  /** Fired whenever the working graph changes (for labels outside the editor). */
  onGraphChange?: (graph: WiringGraph) => void;
  onSave: (graph: WiringGraph) => Promise<void>;
  onCancel: () => void;
}) {
  const [graph, setGraph] = useState<WiringGraph>(() => ({
    nodes: initial.nodes.map((n) => ({ ...n })),
    edges: initial.edges.map((e) => ({ ...e })),
  }));
  const [internalFocus, setInternalFocus] = useState<string | null>(() =>
    selectionLevel(initial, initialSelection, initialFocus),
  );
  const focus = controlledFocus !== undefined ? controlledFocus : internalFocus;
  const setFocus = (id: string | null) => {
    setInternalFocus(id);
    onFocusChange?.(id);
  };
  const [picked, setPicked] = useState<Picked | null>(() => {
    if (!initialSelection) return null;
    if (initialSelection.kind === "node")
      return { id: initialSelection.id, edge: null };
    return ownerOf(
      initial,
      initialSelection.index,
      selectionLevel(initial, initialSelection, initialFocus),
    );
  });
  const [adding, setAdding] = useState(false);
  /** Export function from the canvas, shown as a toolbar button. */
  const [exportPng, setExportPng] = useState<(() => void) | null>(null);
  // Picking something on the canvas closes the add form.
  useEffect(() => {
    if (picked) setAdding(false);
  }, [picked]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const issues = useMemo(() => validateGraph(graph), [graph]);
  // Latest graph/focus for the memoised diagram actions.
  const latest = useRef({ graph, focus });
  latest.current = { graph, focus };
  useEffect(() => {
    onGraphChange?.(graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);
  const dirty = useMemo(
    () => JSON.stringify(graph) !== JSON.stringify(initial),
    [graph, initial],
  );

  function updateNode(id: string, patch: Partial<WiringNode>) {
    setGraph((g) => {
      const nodes = g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      let edges = g.edges;
      if (patch.id && patch.id !== id) {
        edges = g.edges.map((e) => ({
          ...e,
          from: e.from === id ? patch.id! : e.from,
          to: e.to === id ? patch.id! : e.to,
        }));
      }
      return { nodes, edges };
    });
    if (patch.id && patch.id !== id)
      setPicked((p) => (p?.id === id ? { ...p, id: patch.id! } : p));
  }
  function removeNode(id: string) {
    setGraph((g) => {
      const removed = g.nodes.find((n) => n.id === id);
      return {
        // Devices inside the removed one move up to its parent.
        nodes: g.nodes
          .filter((n) => n.id !== id)
          .map((n) =>
            n.parent === id ? { ...n, parent: removed?.parent } : n,
          ),
        edges: g.edges.filter((e) => e.from !== id && e.to !== id),
      };
    });
    setPicked(null);
    if (focus === id) setFocus(null);
  }
  /** "Add device" asks for its name, input and output before creating it. */
  function addNode() {
    setPicked(null);
    setAdding(true);
  }
  /**
   * Create the device from the add form. The first device inside an empty
   * sub-diagram is wired from the group's IN to its OUT, so the signal path
   * exists from the start; any later device starts unconnected and is wired
   * up from its form.
   */
  function createDevice(label: string) {
    const g = graph;
    const name = label.trim() || "New device";
    const node: WiringNode = {
      ...blankNode(g, focus),
      label: name,
      id: uniqueId(slug(name), new Set(g.nodes.map((n) => n.id))),
    };
    const first = !!focus && !g.nodes.some((n) => n.parent === focus);
    const edges = first
      ? [
          ...g.edges,
          newEdge(g, focus, node.id, "in", focus),
          newEdge(g, focus, node.id, "out", focus),
        ]
      : g.edges;
    setGraph({ nodes: [...g.nodes, node], edges });
    setAdding(false);
    // Open on the IN connection so its cable can be checked straight away.
    setPicked({ id: node.id, edge: first ? g.edges.length : null });
  }
  /** A fresh device at the current level, grouped like `like` (or the group we are inside). */
  function blankNode(g: WiringGraph, level: string | null, like?: WiringNode) {
    const taken = new Set(g.nodes.map((n) => n.id));
    const focused = g.nodes.find((n) => n.id === level);
    const node: WiringNode = {
      id: uniqueId("new_device", taken),
      label: "New device",
      type: "other",
      group: like?.group ?? focused?.group ?? "other",
      ...(level ? { parent: level } : {}),
    };
    return node;
  }
  /**
   * "+" on a device's side: add a device next to it, already wired. Right
   * means the anchor feeds the new device; left means the new device feeds
   * the anchor. When the anchor is outside the current sub-diagram, the new
   * device still goes inside.
   */
  function addNeighbor(anchorId: string, side: "left" | "right") {
    const { graph: g, focus: level } = latest.current;
    const anchor = g.nodes.find((n) => n.id === anchorId);
    if (!anchor) return;
    const inside = level ? anchor.parent === level : !anchor.parent;
    const node = blankNode(g, level, inside ? anchor : undefined);
    const edge: WiringEdge =
      side === "right"
        ? { from: anchorId, to: node.id, signal: "analog_line", cable: "XLR" }
        : { from: node.id, to: anchorId, signal: "analog_line", cable: "XLR" };
    setGraph({ nodes: [...g.nodes, node], edges: [...g.edges, edge] });
    setPicked({ id: node.id, edge: g.edges.length });
  }
  /**
   * "+" on an outside device wired to the group itself: add a device inside
   * and wire it to the group's input or output. The outside connection stays
   * on the group.
   */
  function attachDangling(edgeIndex: number) {
    const { graph: g, focus: level } = latest.current;
    const edge = g.edges[edgeIndex];
    if (!edge || !level) return;
    const node = blankNode(g, level);
    const toOut = edge.from === level;
    const link: WiringEdge = {
      from: toOut ? node.id : level,
      to: toOut ? level : node.id,
      signal: edge.signal,
      ...(edge.cable ? { cable: edge.cable } : {}),
    };
    setGraph({ nodes: [...g.nodes, node], edges: [...g.edges, link] });
    setPicked({ id: node.id, edge: g.edges.length });
  }
  const nodeActions = useMemo<NodeActions>(
    () => ({ addNeighbor, attachDangling }),
    // Both read the latest graph/focus from a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  function updateEdge(index: number, patch: Partial<WiringEdge>) {
    setGraph((g) => ({
      ...g,
      edges: g.edges.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  }
  function removeEdge(index: number) {
    setGraph((g) => ({ ...g, edges: g.edges.filter((_, i) => i !== index) }));
    // Later connections shift down by one; the removed one is no longer open.
    setPicked((p) =>
      p && p.edge !== null
        ? { ...p, edge: p.edge === index ? null : p.edge > index ? p.edge - 1 : p.edge }
        : p,
    );
  }
  /** Add a connection into or out of a device, and open it for editing. */
  function addConnection(nodeId: string, direction: Direction, otherId: string) {
    const edge = newEdge(graph, focus, nodeId, direction, otherId);
    setGraph((g) => ({ ...g, edges: [...g.edges, edge] }));
    setPicked({ id: nodeId, edge: graph.edges.length });
  }

  /** Saves the working graph; resolves false if validation or saving failed. */
  async function save(): Promise<boolean> {
    setError("");
    const problems = [
      ...issues,
      ...graph.nodes
        .filter((n) => !n.label.trim())
        .map((n) => `device "${n.id}" needs a name`),
    ];
    if (problems.length) {
      setError(problems.join("; "));
      return false;
    }
    setBusy(true);
    try {
      await onSave(graph);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Leaving with unsaved changes asks first: save, discard, or keep editing.
  const [leaving, setLeaving] = useState(false);
  const leaveRef = useRef<() => void>(() => {});
  leaveRef.current = () => {
    if (busy) return;
    if (dirty) setLeaving(true);
    else onCancel();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // A dialog (this one, or any other) handles its own Escape.
      if (document.querySelector("[role=dialog]")) return;
      leaveRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Closing or reloading the tab: the browser's own "leave site?" prompt.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectedNode = picked
    ? graph.nodes.find((n) => n.id === picked.id)
    : undefined;
  const showForm = !!selectedNode || adding;

  const chatParent = focus ? graph.nodes.find((n) => n.id === focus) : undefined;

  return (
    <div className={cn("space-y-3", fill && "flex h-full flex-col")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {graph.nodes.length} devices · {graph.edges.length} connections
        </span>
        {issues.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
            <AlertTriangle className="size-3" /> {issues.length} issue(s)
          </span>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => leaveRef.current()}
          disabled={busy}
        >
          <X className="size-4" /> Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!exportPng}
          onClick={() => exportPng?.()}
        >
          <ImageDown className="size-4" /> Export PNG
        </Button>
        <Button size="sm" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Dialog open={leaving} onOpenChange={(open) => !busy && setLeaving(open)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Save changes to the diagram?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Save them, or discard them and leave.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setLeaving(false)}
            >
              Keep editing
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setLeaving(false);
                onCancel();
              }}
            >
              <Trash2 className="size-4" /> Discard changes
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (await save()) setLeaving(false);
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "grid gap-3 lg:grid-cols-[1fr_300px]",
          fill && "min-h-0 flex-1 lg:grid-cols-[1fr_360px]",
        )}
      >
        <div
          className={cn(
            "bg-background relative min-w-0 overflow-hidden rounded-md border",
            fill ? "min-h-[320px]" : "h-[420px]",
          )}
        >
          {graph.nodes.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No devices yet. Click "Add device" to start.
            </div>
          ) : focus &&
            !graph.nodes.some((n) => n.parent === focus) &&
            graph.nodes.some((n) => n.id === focus) ? (
            <EmptyGroupCanvas
              graph={graph}
              parent={graph.nodes.find((n) => n.id === focus)!}
              onAdd={addNode}
            />
          ) : (
            <WiringExplorer
              graph={graph}
              pitfalls={pitfalls}
              selectedId={selectedNode?.id ?? null}
              onSelect={(id) => setPicked(id ? { id, edge: null } : null)}
              selectedEdge={picked?.edge ?? null}
              // A cable on the canvas opens under the device it belongs to.
              onSelectEdge={(index) =>
                setPicked((p) =>
                  index === null
                    ? p && { ...p, edge: null }
                    : ownerOf(latest.current.graph, index, latest.current.focus),
                )
              }
              nodeActions={nodeActions}
              focus={focus}
              onFocusChange={(id) => {
                setFocus(id);
                setPicked(null);
                setAdding(false);
              }}
              showBreadcrumb={controlledFocus === undefined}
              onExportReady={(fn) => setExportPng(() => fn)}
            />
          )}
          {/* The only "Add device" button: always in the canvas corner. */}
          <Button
            variant="outline"
            size="sm"
            className="bg-background absolute right-2 bottom-2 z-10 shadow-sm"
            onClick={addNode}
          >
            <Plus className="size-4" />
            {focus
              ? `Add device inside ${graph.nodes.find((n) => n.id === focus)?.label ?? ""}`
              : "Add device"}
          </Button>
        </div>
        <aside
          className={cn(
            "bg-background flex min-w-0 flex-col overflow-hidden rounded-md border",
            fill ? "min-h-0" : "max-h-[420px]",
          )}
        >
          {assistant && (
            <div
              className={cn(
                "min-h-0 border-b",
                showForm ? "h-[45%]" : "flex-1",
              )}
            >
              {/* Not keyed by level: the open chat stays open when moving
                  in and out of a device. */}
              <WiringChat
                campusId={assistant.campusId}
                parent={chatParent}
                graph={graph}
                onGraph={(next) => {
                  setGraph(next);
                  setPicked(null);
                }}
              />
            </div>
          )}
          <div
            className={cn(
              "min-h-0 overflow-y-auto p-3",
              assistant && !showForm ? "hidden" : "flex-1",
            )}
          >
            {adding ? (
              <AddDeviceForm
                key={focus ?? ""}
                graph={graph}
                focus={focus}
                onCreate={createDevice}
                onCancel={() => setAdding(false)}
              />
            ) : selectedNode && picked ? (
              <NodeForm
                node={selectedNode}
                graph={graph}
                level={focus}
                openEdge={picked.edge}
                onChange={(patch) => updateNode(selectedNode.id, patch)}
                onDelete={() => removeNode(selectedNode.id)}
                onOpen={() => {
                  setFocus(selectedNode.id);
                  setPicked(null);
                }}
                onOpenEdge={(index) =>
                  setPicked({ id: selectedNode.id, edge: index })
                }
                onEdgeChange={updateEdge}
                onEdgeRemove={removeEdge}
                onAddConnection={(direction, otherId) =>
                  addConnection(selectedNode.id, direction, otherId)
                }
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Click a device to edit it and the connections in and out of it.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Devices a connection's other end can be: the group we are inside (its own
 * IN/OUT), then the devices on this level, then everything else.
 */
function otherEnds(graph: WiringGraph, node: WiringNode, level: string | null) {
  const group = level ? graph.nodes.find((n) => n.id === level) : undefined;
  const here: WiringNode[] = [];
  const elsewhere: WiringNode[] = [];
  for (const n of graph.nodes) {
    if (n.id === node.id || n.id === group?.id) continue;
    (atLevel(n, level) ? here : elsewhere).push(n);
  }
  // Devices off this level say where they sit.
  const labels = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const hints = new Map(
    elsewhere.map((n) => [
      n.id,
      n.parent ? `in ${labels.get(n.parent) ?? n.parent}` : "main diagram",
    ]),
  );
  return {
    group: group?.id === node.id ? undefined : group,
    here,
    elsewhere,
    hints,
  };
}

function NodeForm({
  node,
  graph,
  level,
  openEdge,
  onChange,
  onDelete,
  onOpen,
  onOpenEdge,
  onEdgeChange,
  onEdgeRemove,
  onAddConnection,
}: {
  node: WiringNode;
  graph: WiringGraph;
  level: string | null;
  /** Index of the connection currently expanded, if any. */
  openEdge: number | null;
  onChange: (patch: Partial<WiringNode>) => void;
  onDelete: () => void;
  onOpen: () => void;
  onOpenEdge: (index: number | null) => void;
  onEdgeChange: (index: number, patch: Partial<WiringEdge>) => void;
  onEdgeRemove: (index: number) => void;
  onAddConnection: (direction: Direction, otherId: string) => void;
}) {
  const taken = new Set(graph.nodes.map((n) => n.id));
  const childCount = countChildren(graph).get(node.id) ?? 0;
  const blocked = descendantsOf(graph, node.id);
  const parentOptions = graph.nodes.filter(
    (n) => n.id !== node.id && !blocked.has(n.id),
  );
  const [idDraft, setIdDraft] = useState(node.id);
  const [prevId, setPrevId] = useState(node.id);
  if (prevId !== node.id) {
    setPrevId(node.id);
    setIdDraft(node.id);
  }
  const ends = otherEnds(graph, node, level);
  const canConnect =
    !!ends.group || ends.here.length > 0 || ends.elsewhere.length > 0;
  // "Add input" / "Add output" first ask which device, then create the
  // connection; nothing is guessed on the user's behalf.
  const [picking, setPicking] = useState<Direction | null>(null);
  const indexed = graph.edges.map((edge, index) => ({ edge, index }));
  const inputs = indexed.filter(({ edge }) => edge.to === node.id);
  const outputs = indexed.filter(({ edge }) => edge.from === node.id);

  const list = (direction: Direction) => {
    const rows = direction === "in" ? inputs : outputs;
    const Icon = direction === "in" ? ArrowRightToLine : ArrowRightFromLine;
    return (
      <div className="space-y-1.5">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Icon className="size-3.5" />
          {direction === "in" ? "Inputs: what feeds it" : "Outputs: what it feeds"}
        </div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-1 text-xs">
            {direction === "in" ? "Nothing feeds it yet." : "It feeds nothing yet."}
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map(({ edge, index }) => (
              <ConnectionRow
                key={index}
                edge={edge}
                direction={direction}
                graph={graph}
                ends={ends}
                open={openEdge === index}
                onToggle={() => onOpenEdge(openEdge === index ? null : index)}
                onChange={(patch) => onEdgeChange(index, patch)}
                onRemove={() => onEdgeRemove(index)}
              />
            ))}
          </ul>
        )}
        {picking === direction ? (
          <div className="flex items-center gap-1">
            <DevicePicker
              defaultOpen
              ariaLabel={direction === "in" ? "What feeds it" : "What it feeds"}
              placeholder={
                direction === "in" ? "Choose what feeds it…" : "Choose what it feeds…"
              }
              {...endPicker(ends, direction)}
              onPick={(id) => {
                setPicking(null);
                onAddConnection(direction, id);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel"
              onClick={() => setPicking(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canConnect}
            onClick={() => setPicking(direction)}
          >
            <Plus className="size-4" />
            {direction === "in" ? "Add input" : "Add output"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Device</div>
      <Field label="Name">
        <Input
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="What people call it"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select
            className={selectClass}
            value={node.type}
            onChange={(e) =>
              onChange({ type: e.target.value as WiringNode["type"] })
            }
          >
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Group">
          <select
            className={selectClass}
            value={node.group}
            onChange={(e) =>
              onChange({ group: e.target.value as WiringNode["group"] })
            }
          >
            {NODE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3 rounded-md border p-2.5">
        <div className="text-sm font-medium">Connections</div>
        {!canConnect && (
          <p className="text-muted-foreground text-xs">
            Add another device to connect this one to.
          </p>
        )}
        {list("in")}
        {list("out")}
      </div>

      <Field label="ID (used by pitfalls)">
        <Input
          value={idDraft}
          className="font-mono text-xs"
          onChange={(e) => setIdDraft(e.target.value)}
          onBlur={() => {
            const next = slug(idDraft);
            if (next === node.id) return setIdDraft(node.id);
            if (taken.has(next)) return setIdDraft(node.id);
            onChange({ id: next });
          }}
        />
      </Field>
      <Field label="Make / model">
        <Input
          value={node.model ?? ""}
          onChange={(e) => onChange({ model: e.target.value || undefined })}
        />
      </Field>
      <Field label="Location">
        <Input
          value={node.location ?? ""}
          onChange={(e) => onChange({ location: e.target.value || undefined })}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          rows={3}
          value={node.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
        />
      </Field>
      <Field label="Part of (which device's internal wiring)">
        <select
          className={selectClass}
          value={node.parent ?? ""}
          onChange={(e) => onChange({ parent: e.target.value || undefined })}
        >
          <option value="">None: shown on the main diagram</option>
          {parentOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onOpen}>
          <FolderOpen className="size-4" />
          {childCount > 0
            ? `Open internal wiring (${childCount} inside)`
            : "Add internal wiring"}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" /> Remove device
        </Button>
      </div>
    </div>
  );
}

/**
 * One connection under its device: a summary line that expands into the
 * connection's fields. This device is fixed as one end; only the other end
 * can be changed here.
 */
function ConnectionRow({
  edge,
  direction,
  graph,
  ends,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  edge: WiringEdge;
  direction: Direction;
  graph: WiringGraph;
  ends: ReturnType<typeof otherEnds>;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<WiringEdge>) => void;
  onRemove: () => void;
}) {
  const into = direction === "in";
  const otherId = into ? edge.from : edge.to;
  const other = graph.nodes.find((n) => n.id === otherId);
  const otherLabel =
    other?.id === ends.group?.id
      ? `${into ? "IN" : "OUT"} of ${other!.label}`
      : (other?.label ?? otherId);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <li className={cn("rounded-md border", open && "border-ring")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="hover:bg-muted/60 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm"
      >
        <Chevron className="text-muted-foreground size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">{into ? "from " : "to "}</span>
          {otherLabel}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {cableLabel(edge) ?? "no cable"} · {edge.signal}
        </span>
      </button>
      {open && (
        <div className="border-t p-2">
          <ConnectionFields
            edge={edge}
            direction={direction}
            ends={ends}
            onChange={onChange}
            onRemove={onRemove}
          />
        </div>
      )}
    </li>
  );
}

/** Picker props for a connection's other end: the group's IN/OUT, then every device by layer. */
function endPicker(ends: ReturnType<typeof otherEnds>, direction: Direction) {
  return {
    groupEnd: ends.group && {
      id: ends.group.id,
      label: `${direction === "in" ? "IN" : "OUT"} of ${ends.group.label}`,
    },
    devices: [...ends.here, ...ends.elsewhere],
    hints: ends.hints,
  };
}

const OTHER = "__other";

function ConnectionFields({
  edge,
  direction,
  ends,
  onChange,
  onRemove,
}: {
  edge: WiringEdge;
  direction: Direction;
  ends: ReturnType<typeof otherEnds>;
  onChange: (patch: Partial<WiringEdge>) => void;
  onRemove: () => void;
}) {
  const into = direction === "in";
  const otherId = into ? edge.from : edge.to;
  const presets = CABLE_PRESETS as readonly string[];
  const isPreset = !edge.cable || presets.includes(edge.cable);
  const [other, setOther] = useState(!isPreset);
  // Focus the free-text box only when "Other…" was just picked, so a row
  // that opens with a custom cable does not steal focus from the device name.
  const [focusOther, setFocusOther] = useState(false);
  // Mono/stereo only applies to XLR; drop it when the cable changes away.
  const setCable = (cable: string | undefined) =>
    onChange(hasCableFormat(cable) ? { cable } : { cable, format: undefined });
  return (
    <div className="space-y-3">
      <Field label={into ? "From: what feeds it" : "To: what it feeds"}>
        <DevicePicker
          value={otherId}
          ariaLabel={into ? "What feeds it" : "What it feeds"}
          placeholder="Choose a device…"
          {...endPicker(ends, direction)}
          onPick={(id) => onChange(into ? { from: id } : { to: id })}
        />
      </Field>
      <Field label="Cable">
        <select
          className={selectClass}
          value={other ? OTHER : (edge.cable ?? "")}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setOther(true);
              setFocusOther(true);
              return;
            }
            setOther(false);
            setCable(e.target.value || undefined);
          }}
        >
          <option value="">Not specified</option>
          {presets.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
        {other && (
          <Input
            autoFocus={focusOther}
            placeholder="e.g. NL4, TRS, HDMI"
            value={edge.cable ?? ""}
            onChange={(e) => setCable(e.target.value || undefined)}
            className="mt-1"
          />
        )}
      </Field>
      {hasCableFormat(edge.cable) && (
        <Field label="Mono or stereo">
          <div className="flex gap-1.5">
            {CABLE_FORMATS.map((f) => {
              const on = edge.format === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ format: on ? undefined : f })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </Field>
      )}
      <Field label="Signal">
        <select
          className={selectClass}
          value={edge.signal}
          onChange={(e) =>
            onChange({ signal: e.target.value as WiringEdge["signal"] })
          }
        >
          {SIGNAL_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Port on destination">
          <Input
            value={edge.port ?? ""}
            placeholder="A in 1"
            onChange={(e) => onChange({ port: e.target.value || undefined })}
          />
        </Field>
        <Field label="Console channel">
          <Input
            value={edge.channel ?? ""}
            placeholder="LV1 ch 1"
            onChange={(e) => onChange({ channel: e.target.value || undefined })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          rows={2}
          value={edge.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
        />
      </Field>
      <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
        <Trash2 className="size-4" /> Remove connection
      </Button>
    </div>
  );
}

/**
 * New device: just a name. It starts with no connections; those are added
 * from the device's form once it exists.
 */
function AddDeviceForm({
  graph,
  focus,
  onCreate,
  onCancel,
}: {
  graph: WiringGraph;
  focus: string | null;
  onCreate: (label: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const parent = focus ? graph.nodes.find((n) => n.id === focus) : undefined;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate(label);
      }}
    >
      <div className="text-sm font-medium">
        {parent ? `New device inside ${parent.label}` : "New device"}
      </div>
      <Field label="Name">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What people call it"
          autoFocus
        />
      </Field>
      <p className="text-muted-foreground text-xs">
        {parent && !graph.nodes.some((n) => n.parent === parent.id)
          ? `The first device inside is wired from the IN of ${parent.label} to its OUT. Change either from the device's form.`
          : parent
            ? `It starts unconnected. Next, add what feeds it and what it feeds, including the IN and OUT of ${parent.label}.`
            : "It starts unconnected. Next, add what feeds it and what it feeds."}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          <Plus className="size-4" /> Add device
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
