// Wiring graph: the machine-readable source of truth for a campus.
// Stored as YAML text in Convex, parsed here for the diagram, validation,
// diffing, and the agent's prompt.
import { z } from "zod";
import YAML from "yaml";

export const NODE_TYPES = [
  "source",
  "stagebox",
  "network",
  "console",
  "server",
  "processor",
  "amp",
  "speaker",
  "playback",
  "computer",
  "interface",
  "wireless",
  "iem",
  "monitor",
  "video",
  "subsystem",
  "other",
] as const;

export const NODE_GROUPS = [
  "drums",
  "bass",
  "guitars",
  "keys",
  "vocals",
  "playback",
  "video",
  "stage_io",
  "network",
  "foh",
  "pa",
  "monitors",
  "broadcast",
  "lighting",
  "other",
] as const;

export const SIGNAL_TYPES = [
  "analog_mic",
  "analog_line",
  "aes",
  "dante",
  "soundgrid",
  "usb",
  "midi",
  "network",
  "speaker",
  "hdmi",
  "sdi",
  "osc",
  "rf",
  "other",
] as const;

/** Cable choices offered in the diagram editor. Anything else is free text. */
export const CABLE_PRESETS = [
  "XLR",
  "Cat 6",
  "USB Type A",
  "USB Type B",
  "USB Type C",
] as const;

/** Offered when the cable is XLR. */
export const CABLE_FORMATS = ["mono", "stereo"] as const;

/** Cables that can be mono or stereo. */
export function hasCableFormat(cable: string | undefined): boolean {
  return cable?.trim().toUpperCase() === "XLR";
}

/** Cable as shown to people, e.g. "XLR (stereo)". */
export function cableLabel(edge: {
  cable?: string;
  format?: (typeof CABLE_FORMATS)[number];
}): string | undefined {
  if (!edge.cable) return undefined;
  return edge.format && hasCableFormat(edge.cable)
    ? `${edge.cable} (${edge.format})`
    : edge.cable;
}

export type NodeType = (typeof NODE_TYPES)[number];
export type NodeGroup = (typeof NODE_GROUPS)[number];
export type SignalType = (typeof SIGNAL_TYPES)[number];

const optionalText = z.string().optional();

export const nodeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, "ids are snake_case"),
  label: z.string().min(1),
  type: z.enum(NODE_TYPES),
  group: z.enum(NODE_GROUPS),
  model: optionalText,
  location: optionalText,
  notes: optionalText,
  /** id of the node whose sub-diagram this device lives in. */
  parent: optionalText,
});

export const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  signal: z.enum(SIGNAL_TYPES),
  cable: optionalText,
  /** XLR only: mono or stereo. */
  format: z.enum(CABLE_FORMATS).optional(),
  port: optionalText,
  channel: optionalText,
  notes: optionalText,
});

export const wiringGraphSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type WiringNode = z.infer<typeof nodeSchema>;
export type WiringEdge = z.infer<typeof edgeSchema>;
export type WiringGraph = z.infer<typeof wiringGraphSchema>;

// Schema the AI fills in. Nullable instead of optional so structured output
// always emits every key; normalizeAiGraph() strips the nulls.
export const aiWiringSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().describe("stable snake_case id, e.g. kick_in, stagebox_a"),
      label: z.string().describe("what people call it"),
      type: z.enum(NODE_TYPES),
      group: z.enum(NODE_GROUPS),
      model: z.string().nullable().describe("make and model if known"),
      location: z.string().nullable().describe("where in the room"),
      notes: z.string().nullable(),
      parent: z
        .string()
        .nullable()
        .describe(
          "id of a 'subsystem' node this device sits inside, for a sub-diagram (e.g. everything at front of house inside foh). Null for top-level devices.",
        ),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string().describe("node id the signal leaves"),
      to: z.string().describe("node id the signal enters"),
      signal: z.enum(SIGNAL_TYPES),
      cable: z
        .string()
        .nullable()
        .describe(
          "cable type: XLR, Cat 6, USB Type A, USB Type B, USB Type C, or another (e.g. NL4, TRS)",
        ),
      format: z
        .enum(CABLE_FORMATS)
        .nullable()
        .describe("XLR cables only: mono or stereo if stated; otherwise null"),
      port: z.string().nullable().describe("physical jack on the `to` device"),
      channel: z
        .string()
        .nullable()
        .describe("where it lands on the console, e.g. LV1 ch 3"),
      notes: z.string().nullable(),
    }),
  ),
  assumptions: z
    .array(z.string())
    .describe(
      "Anything inferred, guessed, or missing from the source text that a human should confirm.",
    ),
});

export type AiWiringOutput = z.infer<typeof aiWiringSchema>;

export function normalizeAiGraph(out: AiWiringOutput): WiringGraph {
  const strip = <T extends Record<string, unknown>>(o: T) =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) => v !== null && v !== ""),
    ) as T;
  return {
    nodes: out.nodes.map((n) => strip(n) as unknown as WiringNode),
    edges: out.edges.map((e) => strip(e) as unknown as WiringEdge),
  };
}

export interface ParsedWiring {
  graph: WiringGraph | null;
  issues: string[];
}

/** Parse YAML text into a validated graph. Reference problems are reported
 *  as issues but do not prevent the graph from being returned. */
export function parseWiringYaml(text: string): ParsedWiring {
  if (!text.trim()) return { graph: null, issues: [] };
  let raw: unknown;
  try {
    raw = YAML.parse(text);
  } catch (e) {
    return { graph: null, issues: [`YAML syntax: ${(e as Error).message}`] };
  }
  const parsed = wiringGraphSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      graph: null,
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }
  return { graph: parsed.data, issues: validateGraph(parsed.data) };
}

export function validateGraph(graph: WiringGraph): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    if (ids.has(n.id)) issues.push(`duplicate node id "${n.id}"`);
    ids.add(n.id);
  }
  const parentOf = new Map(graph.nodes.map((n) => [n.id, n.parent]));
  for (const n of graph.nodes) {
    if (!n.parent) continue;
    if (n.parent === n.id) issues.push(`"${n.id}" cannot be inside itself`);
    else if (!ids.has(n.parent))
      issues.push(`"${n.id}": unknown parent "${n.parent}"`);
    else {
      const seen = new Set<string>([n.id]);
      let cur: string | undefined = n.parent;
      while (cur) {
        if (seen.has(cur)) {
          issues.push(`"${n.id}": parent chain loops`);
          break;
        }
        seen.add(cur);
        cur = parentOf.get(cur);
      }
    }
  }
  graph.edges.forEach((e, i) => {
    if (!ids.has(e.from))
      issues.push(`edge ${i + 1}: unknown "from" node "${e.from}"`);
    if (!ids.has(e.to))
      issues.push(`edge ${i + 1}: unknown "to" node "${e.to}"`);
  });
  return issues;
}

export function wiringToYaml(graph: WiringGraph, header?: string): string {
  const doc = YAML.stringify(graph, { lineWidth: 0 });
  return (header ? `# ${header}\n` : "") + doc;
}

export interface WiringDiff {
  addedNodes: WiringNode[];
  removedNodes: WiringNode[];
  changedNodes: { before: WiringNode; after: WiringNode }[];
  addedEdges: WiringEdge[];
  removedEdges: WiringEdge[];
  /** every node id that was added, removed, changed, or touched by an edge change */
  touchedNodeIds: string[];
}

const edgeKey = (e: WiringEdge) =>
  JSON.stringify([
    e.from,
    e.to,
    e.signal,
    e.port ?? "",
    e.channel ?? "",
    e.cable ?? "",
    e.format ?? "",
    e.notes ?? "",
  ]);
const sameNode = (a: WiringNode, b: WiringNode) =>
  ["id", "label", "type", "group", "model", "location", "notes", "parent"].every(
    (key) => a[key as keyof WiringNode] === b[key as keyof WiringNode],
  );

export function diffWiring(
  before: WiringGraph | null,
  after: WiringGraph,
): WiringDiff {
  const b = before ?? { nodes: [], edges: [] };
  const bNodes = new Map(b.nodes.map((n) => [n.id, n]));
  const aNodes = new Map(after.nodes.map((n) => [n.id, n]));
  const addedNodes = after.nodes.filter((n) => !bNodes.has(n.id));
  const removedNodes = b.nodes.filter((n) => !aNodes.has(n.id));
  const changedNodes = after.nodes
    .filter((n) => bNodes.has(n.id) && !sameNode(bNodes.get(n.id)!, n))
    .map((n) => ({ before: bNodes.get(n.id)!, after: n }));
  const bEdges = new Set(b.edges.map(edgeKey));
  const aEdges = new Set(after.edges.map(edgeKey));
  const addedEdges = after.edges.filter((e) => !bEdges.has(edgeKey(e)));
  const removedEdges = b.edges.filter((e) => !aEdges.has(edgeKey(e)));
  const touched = new Set<string>();
  for (const n of [...addedNodes, ...removedNodes]) touched.add(n.id);
  for (const c of changedNodes) touched.add(c.after.id);
  for (const e of [...addedEdges, ...removedEdges]) {
    touched.add(e.from);
    touched.add(e.to);
  }
  return {
    addedNodes,
    removedNodes,
    changedNodes,
    addedEdges,
    removedEdges,
    touchedNodeIds: [...touched],
  };
}

/** Plain-text rendering of the graph for the agent's system prompt. */
export function describeWiring(graph: WiringGraph): string {
  const lines: string[] = [
    "DEVICES (id: label [type/group] model | location | notes)",
  ];
  for (const n of graph.nodes) {
    const bits = [
      n.model,
      n.location,
      n.notes,
      n.parent && `inside ${n.parent}`,
    ]
      .filter(Boolean)
      .join(" | ");
    lines.push(
      `- ${n.id}: ${n.label} [${n.type}/${n.group}]${bits ? " " + bits : ""}`,
    );
  }
  lines.push(
    "",
    "CONNECTIONS (from -> to via signal; cable; port on destination; console channel; notes)",
  );
  for (const e of graph.edges) {
    const bits = [
      e.cable && `cable ${cableLabel(e)}`,
      e.port && `port ${e.port}`,
      e.channel && `channel ${e.channel}`,
      e.notes,
    ]
      .filter(Boolean)
      .join("; ");
    lines.push(
      `- ${e.from} -> ${e.to} via ${e.signal}${bits ? "; " + bits : ""}`,
    );
  }
  return lines.join("\n");
}

export const GROUP_LABELS: Record<NodeGroup, string> = {
  drums: "Drums",
  bass: "Bass",
  guitars: "Guitars",
  keys: "Keys",
  vocals: "Vocals",
  playback: "Playback",
  video: "Video",
  stage_io: "Stage I/O",
  network: "Network",
  foh: "FOH",
  pa: "PA",
  monitors: "Monitors / IEM",
  broadcast: "Broadcast",
  lighting: "Lighting",
  other: "Other",
};

/**
 * Devices bucketed by layer (in NODE_GROUPS order), keeping diagram order
 * within a layer. The search matches name, id, model or layer name.
 */
export function groupDeviceOptions<
  T extends { id: string; label: string; group: NodeGroup; model?: string },
>(nodes: T[], query = ""): { group: NodeGroup; label: string; nodes: T[] }[] {
  const q = query.trim().toLowerCase();
  const matches = (n: T) =>
    !q ||
    [n.label, n.id, n.model ?? "", GROUP_LABELS[n.group]].some((s) =>
      s.toLowerCase().includes(q),
    );
  return NODE_GROUPS.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    nodes: nodes.filter((n) => n.group === group && matches(n)),
  })).filter((g) => g.nodes.length > 0);
}

export const GROUP_COLORS: Record<NodeGroup, string> = {
  drums: "#f97316",
  bass: "#a855f7",
  guitars: "#ec4899",
  keys: "#06b6d4",
  vocals: "#eab308",
  playback: "#22c55e",
  video: "#6366f1",
  stage_io: "#64748b",
  network: "#0ea5e9",
  foh: "#f43f5e",
  pa: "#ef4444",
  monitors: "#14b8a6",
  broadcast: "#8b5cf6",
  lighting: "#fbbf24",
  other: "#9ca3af",
};

// ---- Nested (sub-)diagrams -------------------------------------------------
// A node with `parent` lives inside that node's sub-diagram. The stored graph
// stays flat (unique ids everywhere), and views are computed per level.

export interface WiringView {
  /** Nodes drawn at this level: direct children of `focus` plus outside nodes they connect to. */
  nodes: WiringNode[];
  /** Edges with endpoints mapped to this level; `index` is the position in graph.edges. */
  edges: (WiringEdge & { index: number })[];
  /** ids drawn as "outside this diagram" placeholders. */
  external: Set<string>;
  /** Direct-child counts for every node in the full graph. */
  childCount: Map<string, number>;
  /**
   * Connections attached to the focused group itself rather than to a device
   * inside it (e.g. "Piano -> Stage rack" drawn before the internals existed).
   * Shown as ports so they can be re-attached to the right inner device.
   */
  dangling: (WiringEdge & {
    index: number;
    outgoing: boolean;
    /** The outside end, drawn as its own card. */
    otherId: string;
    other?: WiringNode;
    otherLabel: string;
  })[];
  /**
   * Connections between a device inside and the focused group itself: the
   * group's input feeding that device (`toOut` false) or the device feeding
   * the group's output (`toOut` true). Stored as child <-> parent edges, so
   * the main diagram folds them away.
   */
  ports: (WiringEdge & { index: number; nodeId: string; toOut: boolean })[];
}

/** Direct-child counts for every node. */
export function countChildren(graph: WiringGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const n of graph.nodes)
    if (n.parent) counts.set(n.parent, (counts.get(n.parent) ?? 0) + 1);
  return counts;
}

/** Ancestors of a node from the top level down (excluding the node itself). */
export function ancestorsOf(graph: WiringGraph, id: string): WiringNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: WiringNode[] = [];
  const seen = new Set<string>([id]);
  let cur = byId.get(id)?.parent;
  while (cur && !seen.has(cur)) {
    const n = byId.get(cur);
    if (!n) break;
    out.unshift(n);
    seen.add(cur);
    cur = n.parent;
  }
  return out;
}

/** Every node inside `id`, at any depth. */
export function descendantsOf(graph: WiringGraph, id: string): Set<string> {
  const kids = new Map<string, string[]>();
  for (const n of graph.nodes)
    if (n.parent) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id]);
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    for (const k of kids.get(stack.pop()!) ?? [])
      if (!out.has(k)) {
        out.add(k);
        stack.push(k);
      }
  }
  return out;
}

/**
 * The graph as seen at one level. `focus` null is the main diagram (top-level
 * nodes; connections into nested devices collapse onto their top-level
 * parent). With a focus, only its contents are shown, like opening a folder:
 * its direct children, plus outside devices they connect to as placeholders.
 * The focused device itself is not drawn.
 */
export function viewGraph(graph: WiringGraph, focus: string | null): WiringView {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const childCount = countChildren(graph);
  const inside = focus ? descendantsOf(graph, focus) : null;

  // Map a node to what represents it at this level.
  const cache = new Map<string, string>();
  const represent = (id: string): string => {
    const hit = cache.get(id);
    if (hit) return hit;
    const seen = new Set<string>();
    let cur = id;
    let result = id;
    for (;;) {
      const n = byId.get(cur);
      if (!n || seen.has(cur)) break;
      seen.add(cur);
      if (focus && n.parent === focus) {
        result = cur;
        break;
      }
      if (!n.parent) {
        result = cur;
        break;
      }
      cur = n.parent;
    }
    cache.set(id, result);
    return result;
  };

  const level = graph.nodes.filter((n) =>
    focus ? n.parent === focus : !n.parent,
  );
  const shown = new Map(level.map((n) => [n.id, n]));
  const external = new Set<string>();
  const edges: WiringView["edges"] = [];
  const dangling: WiringView["dangling"] = [];
  const ports: WiringView["ports"] = [];
  const dedupe = new Set<string>();
  graph.edges.forEach((e, index) => {
    if (!byId.has(e.from) || !byId.has(e.to)) return;
    if (focus && (e.from === focus || e.to === focus)) {
      const outgoing = e.from === focus;
      const otherId = outgoing ? e.to : e.from;
      if (inside?.has(otherId)) {
        const nodeId = represent(otherId);
        if (nodeId !== focus)
          ports.push({ ...e, index, nodeId, toOut: !outgoing });
        return;
      }
      dangling.push({
        ...e,
        index,
        outgoing,
        otherId,
        other: byId.get(otherId),
        otherLabel: byId.get(otherId)?.label ?? otherId,
      });
      return;
    }
    if (inside && !inside.has(e.from) && !inside.has(e.to)) return;
    const a = represent(e.from);
    const b = represent(e.to);
    if (a === b) return;
    const key = `${a}|${b}|${e.signal}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    for (const id of [a, b])
      if (!shown.has(id)) {
        shown.set(id, byId.get(id)!);
        external.add(id);
      }
    edges.push({ ...e, from: a, to: b, index });
  });
  return {
    nodes: [...shown.values()],
    edges,
    external,
    childCount,
    dangling,
    ports,
  };
}

/**
 * Append AI- or hand-made internal wiring to one device. Existing nodes and
 * edges are kept; generated nodes are forced inside `parentId`, ids that clash
 * with unrelated existing nodes are suffixed, and duplicate edges are dropped.
 */
export function mergeInternalWiring(
  current: WiringGraph,
  parentId: string,
  generated: WiringGraph,
  options: { replace?: boolean } = {},
): { graph: WiringGraph; renamed: Record<string, string>; added: number } {
  if (!current.nodes.some((n) => n.id === parentId))
    throw new Error(`Unknown device "${parentId}"`);
  if (options.replace) {
    // The generated graph is the complete internal wiring: drop what was inside.
    const old = descendantsOf(current, parentId);
    current = {
      nodes: current.nodes.filter((n) => !old.has(n.id)),
      edges: current.edges.filter((e) => !old.has(e.from) && !old.has(e.to)),
    };
  }
  const byId = new Map(current.nodes.map((n) => [n.id, n]));
  const subtree = descendantsOf(current, parentId);
  const renamed: Record<string, string> = {};
  const nodes = [...current.nodes];
  let added = 0;
  for (const raw of generated.nodes) {
    if (raw.id === parentId) continue;
    let id = raw.id;
    const existing = byId.get(id);
    if (existing && !subtree.has(id)) {
      // Clashes with a device elsewhere: give it a fresh id.
      let n = 2;
      while (byId.has(`${raw.id}_${n}`)) n++;
      id = `${raw.id}_${n}`;
      renamed[raw.id] = id;
    }
    const parent =
      raw.parent && raw.parent !== parentId && (subtree.has(raw.parent) || generated.nodes.some((g) => g.id === raw.parent))
        ? (renamed[raw.parent] ?? raw.parent)
        : parentId;
    const node: WiringNode = { ...raw, id, parent };
    const at = nodes.findIndex((n) => n.id === id);
    if (at >= 0 && subtree.has(id)) nodes[at] = node;
    else {
      nodes.push(node);
      added++;
    }
    byId.set(id, node);
  }
  const keys = new Set(current.edges.map(edgeKey));
  const edges = [...current.edges];
  for (const e of generated.edges) {
    const mapped = {
      ...e,
      from: renamed[e.from] ?? e.from,
      to: renamed[e.to] ?? e.to,
    };
    if (!byId.has(mapped.from) || !byId.has(mapped.to)) continue;
    const key = edgeKey(mapped);
    if (keys.has(key)) continue;
    keys.add(key);
    edges.push(mapped);
  }
  return { graph: { nodes, edges }, renamed, added };
}
