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
});

export const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  signal: z.enum(SIGNAL_TYPES),
  cable: optionalText,
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
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string().describe("node id the signal leaves"),
      to: z.string().describe("node id the signal enters"),
      signal: z.enum(SIGNAL_TYPES),
      cable: z.string().nullable().describe("cable type, e.g. XLR, Cat6, NL4"),
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
    e.notes ?? "",
  ]);
const sameNode = (a: WiringNode, b: WiringNode) =>
  ["id", "label", "type", "group", "model", "location", "notes"].every(
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
    const bits = [n.model, n.location, n.notes].filter(Boolean).join(" | ");
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
      e.cable && `cable ${e.cable}`,
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
