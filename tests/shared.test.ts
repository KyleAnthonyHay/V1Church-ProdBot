import { describe, expect, test } from "bun:test";
import {
  describeWiring,
  diffWiring,
  normalizeAiGraph,
  parseWiringYaml,
  validateGraph,
  wiringToYaml,
  type WiringGraph,
  viewGraph,
  ancestorsOf,
  mergeInternalWiring,
  cableLabel,
  wiringGraphSchema,
} from "../shared/wiring";
import {
  parsePitfalls,
  parseRunbookSteps,
  pitfallsTouching,
  recordPitfallFix,
  validatePitfallRefs,
  parsePitfallDetails,
  pitfallsToMarkdown,
  nextPitfallId,
} from "../shared/docs";
import { documentFromFile, validateImport } from "../shared/backup";
import { budgetHistory } from "../shared/history";

const graph: WiringGraph = {
  nodes: [
    { id: "keys", label: "Keys", type: "source", group: "keys" },
    { id: "box_a", label: "Stage box A", type: "stagebox", group: "stage_io" },
  ],
  edges: [
    {
      from: "keys",
      to: "box_a",
      signal: "analog_line",
      cable: "XLR",
      port: "1",
      channel: "3",
    },
  ],
};
describe("wiring", () => {
  test("round trips YAML and reports syntax / schema failures", () => {
    expect(parseWiringYaml(wiringToYaml(graph)).graph).toEqual(graph);
    expect(parseWiringYaml("")).toEqual({ graph: null, issues: [] });
    expect(parseWiringYaml("nodes: [").graph).toBeNull();
    expect(
      parseWiringYaml("nodes: nope\nedges: []").issues.length,
    ).toBeGreaterThan(0);
  });
  test("detects duplicates and dangling edges", () => {
    expect(
      validateGraph({
        nodes: [graph.nodes[0]!, graph.nodes[0]!],
        edges: graph.edges,
      }),
    ).toHaveLength(2);
  });
  test("tracks cable / notes changes and their affected endpoints", () => {
    const changed = {
      ...graph,
      edges: [{ ...graph.edges[0]!, cable: "TRS", notes: "new route" }],
    };
    const diff = diffWiring(graph, changed);
    expect(diff.addedEdges).toHaveLength(1);
    expect(diff.removedEdges).toHaveLength(1);
    expect(diff.touchedNodeIds).toEqual(["keys", "box_a"]);
  });
  test("node property order does not create a false change", () => {
    const reordered = {
      group: "keys",
      type: "source",
      label: "Keys",
      id: "keys",
    } as const;
    expect(
      diffWiring(graph, { ...graph, nodes: [reordered, graph.nodes[1]!] })
        .changedNodes,
    ).toEqual([]);
  });
  test("records added, removed and edited devices", () => {
    const next: WiringGraph = {
      nodes: [
        { ...graph.nodes[0]!, model: "Nord" },
        { id: "foh", label: "FOH", type: "console", group: "foh" },
      ],
      edges: [],
    };
    const diff = diffWiring(graph, next);
    expect(diff.addedNodes.map((n) => n.id)).toEqual(["foh"]);
    expect(diff.removedNodes.map((n) => n.id)).toEqual(["box_a"]);
    expect(diff.changedNodes[0]?.after.id).toBe("keys");
  });
  test("normalizes nullable AI fields and describes cable routing", () => {
    const normalized = normalizeAiGraph({
      nodes: [
        { ...graph.nodes[0]!, model: null, location: "", notes: "verified" },
      ],
      edges: [],
      assumptions: [],
    });
    expect(normalized.nodes[0]?.model).toBeUndefined();
    expect(normalized.nodes[0]?.notes).toBe("verified");
    expect(describeWiring(graph)).toContain(
      "keys -> box_a via analog_line; cable XLR; port 1; channel 3",
    );
  });
});
const pitfallsMd =
  "## P-001: No keys\n- nodes: [\"keys\", 'box_a']\n- fix: Cable\n- last seen: 2026-01-01 (old)\n\n## P-002: No click\n- nodes: [playback]\n";
describe("documents", () => {
  test("parses quoted node ids and validates references", () => {
    const pitfalls = parsePitfalls(pitfallsMd);
    expect(pitfalls[0]?.nodes).toEqual(["keys", "box_a"]);
    expect(validatePitfallRefs(pitfalls, new Set(["keys", "box_a"]))).toEqual([
      'P-002 references unknown node "playback"',
    ]);
    expect(pitfallsTouching(pitfalls, ["box_a"]).map((p) => p.id)).toEqual([
      "P-001",
    ]);
    expect(pitfallsTouching(pitfalls, ["key"])).toEqual([]);
  });
  test("parses numbered runbook rows with timing, owner and outcomes", () => {
    expect(
      parseRunbookSteps(
        "| # | Time | Owner | Step | Done when | If not |\n|---|---|---|---|---|---|\n| 1 | 6:30 | Lead | Power on | Link lights | P-001, P-002 |",
      ),
    ).toEqual([
      {
        number: "1",
        time: "6:30",
        owner: "Lead",
        step: "Power on",
        doneWhen: "Link lights",
        pitfalls: ["P-001", "P-002"],
      },
    ]);
  });
  test("last-seen update touches only the matching pitfall", () => {
    const result = recordPitfallFix(
      pitfallsMd,
      "P-001",
      "2026-09-15",
      "Changed cable",
    );
    expect(result).toContain("- last seen: 2026-09-15 (Changed cable)");
    expect(result).not.toContain("2026-01-01");
    expect(parsePitfalls(result)[1]?.body).toBe(
      parsePitfalls(pitfallsMd)[1]?.body,
    );
    expect(() =>
      recordPitfallFix(pitfallsMd, "P-003", "2026-09-15", "missing"),
    ).toThrow();
  });
});
test("imports reject duplicate kinds, wrong scopes and invalid wiring", () => {
  const file = documentFromFile("wiring.yaml", wiringToYaml(graph));
  expect(validateImport([file], false)).toEqual([file]);
  expect(() => validateImport([file, file], false)).toThrow("Duplicate");
  expect(() => validateImport([file], true)).toThrow("scope");
  expect(() =>
    validateImport([{ kind: "wiring", content: "bad" }], false),
  ).toThrow("Invalid wiring");
  expect(() => documentFromFile("../wiring.yaml", "")).toThrow();
});
test("history budget retains complete recent turns", () => {
  const messages = [
    { role: "user", content: "12345" },
    { role: "assistant", content: "12345" },
    { role: "user", content: "latest" },
  ];
  expect(budgetHistory(messages, 11)).toEqual([messages[2]!]);
  expect(budgetHistory(messages, 16)).toEqual(messages);
});

describe("structured pitfalls", () => {
  const legacy =
    "Intro text.\n\n## P-001: No keys\n- symptom: No keys in the PA\n- nodes: [keys, box_a]\n- likely causes:\n  1. Cable\n  2. Mute\n- check:\n  1. Look at box A\n- fix: Swap the XLR\n- last seen: 2026-01-01 (old)\n- owner: Kyle\n";
  test("parses legacy keys into issue/solution and keeps unknown lines", () => {
    const { preamble, pitfalls } = parsePitfallDetails(legacy);
    expect(preamble).toBe("Intro text.");
    const p = pitfalls[0]!;
    expect(p.id).toBe("P-001");
    expect(p.title).toBe("No keys");
    expect(p.symptom).toBe("No keys in the PA");
    expect(p.nodes).toEqual(["keys", "box_a"]);
    expect(p.issue).toBe("Cable\nMute");
    expect(p.check).toEqual(["Look at box A"]);
    expect(p.solution).toBe("Swap the XLR");
    expect(p.lastSeen).toBe("2026-01-01 (old)");
    expect(p.extra).toEqual(["- owner: Kyle"]);
  });
  test("round-trips through markdown and stays parseable", () => {
    const first = parsePitfallDetails(legacy);
    const md = pitfallsToMarkdown(first.pitfalls, first.preamble);
    expect(md).toContain("- issue: Cable\n  Mute");
    expect(md).toContain("- solution: Swap the XLR");
    const second = parsePitfallDetails(md);
    expect(second).toEqual(first);
    expect(parsePitfalls(md)[0]?.nodes).toEqual(["keys", "box_a"]);
    expect(nextPitfallId(second.pitfalls)).toBe("P-002");
  });
});

describe("nested wiring views", () => {
  const graph = {
    nodes: [
      { id: "stage", label: "Stage", type: "subsystem", group: "stage_io" },
      { id: "foh", label: "FOH", type: "subsystem", group: "foh" },
      { id: "lv1", label: "LV1", type: "console", group: "foh", parent: "foh" },
      { id: "rack", label: "Rack", type: "server", group: "foh", parent: "foh" },
      { id: "box_a", label: "Box A", type: "stagebox", group: "stage_io", parent: "stage" },
      { id: "pa", label: "PA", type: "speaker", group: "pa" },
    ],
    edges: [
      { from: "box_a", to: "rack", signal: "soundgrid" },
      { from: "rack", to: "lv1", signal: "soundgrid" },
      { from: "lv1", to: "pa", signal: "analog_line" },
    ],
  } as const;
  test("main view collapses nested devices onto their parents", () => {
    const v = viewGraph(structuredClone(graph) as never, null);
    expect(v.nodes.map((n) => n.id).sort()).toEqual(["foh", "pa", "stage"]);
    expect(v.edges.map((e) => `${e.from}>${e.to}`)).toEqual(["stage>foh", "foh>pa"]);
    expect(v.childCount.get("foh")).toBe(2);
    expect(v.external.size).toBe(0);
  });
  test("focused view shows children and external placeholders", () => {
    const v = viewGraph(structuredClone(graph) as never, "foh");
    expect(v.nodes.map((n) => n.id).sort()).toEqual(["lv1", "pa", "rack", "stage"]);
    expect([...v.external].sort()).toEqual(["pa", "stage"]);
    expect(v.edges.map((e) => `${e.from}>${e.to}:${e.index}`)).toEqual([
      "stage>rack:0",
      "rack>lv1:1",
      "lv1>pa:2",
    ]);
    expect(ancestorsOf(structuredClone(graph) as never, "lv1").map((n) => n.id)).toEqual(["foh"]);
  });
  test("a connection on the group itself is a dangling port inside, not a card", () => {
    const g = structuredClone(graph) as never as {
      nodes: { id: string; label: string; type: string; group: string; parent?: string }[];
      edges: { from: string; to: string; signal: string }[];
    };
    g.edges.push({ from: "foh", to: "pa", signal: "aes" });
    const v = viewGraph(g as never, "foh");
    expect(v.nodes.some((n) => n.id === "foh")).toBe(false);
    expect(
      v.dangling.map((e) => `${e.from}>${e.to}:${e.index}:${e.outgoing}:${e.otherLabel}`),
    ).toEqual(["foh>pa:3:true:PA"]);
    expect(v.edges.some((e) => e.from === "foh")).toBe(false);
    const main = viewGraph(g as never, null);
    expect(main.dangling).toEqual([]);
    expect(main.edges.filter((e) => e.from === "foh" && e.to === "pa").length).toBe(2);
  });
  test("a device wired to its group's own input/output is a port edge inside", () => {
    const g = structuredClone(graph) as never as {
      nodes: { id: string; label: string; type: string; group: string; parent?: string }[];
      edges: { from: string; to: string; signal: string }[];
    };
    g.edges.push({ from: "lv1", to: "foh", signal: "aes" });
    g.edges.push({ from: "foh", to: "rack", signal: "aes" });
    const v = viewGraph(g as never, "foh");
    expect(v.ports.map((p) => `${p.nodeId}:${p.toOut}:${p.index}`)).toEqual([
      "lv1:true:3",
      "rack:false:4",
    ]);
    expect(v.dangling).toEqual([]);
    expect(v.edges.some((e) => e.from === "foh" || e.to === "foh")).toBe(false);
    const main = viewGraph(g as never, null);
    expect(main.edges.some((e) => e.from === e.to)).toBe(false);
  });
  test("XLR connections can be mono or stereo", () => {
    expect(cableLabel({ cable: "XLR", format: "stereo" })).toBe("XLR (stereo)");
    expect(cableLabel({ cable: "Cat 6", format: "mono" })).toBe("Cat 6");
    expect(cableLabel({ cable: "XLR" })).toBe("XLR");
    const parsed = wiringGraphSchema.safeParse({
      nodes: [],
      edges: [{ from: "a", to: "b", signal: "analog_line", cable: "XLR", format: "mono" }],
    });
    expect(parsed.success).toBe(true);
  });
  test("validateGraph rejects bad parents", () => {
    const issues = validateGraph({
      nodes: [
        { id: "a", label: "A", type: "other", group: "other", parent: "a" },
        { id: "b", label: "B", type: "other", group: "other", parent: "zzz" },
      ],
      edges: [],
    });
    expect(issues.length).toBe(2);
  });
});

describe("mergeInternalWiring", () => {
  const current = {
    nodes: [
      { id: "piano", label: "Piano", type: "playback", group: "keys" },
      { id: "rack", label: "Rack", type: "stagebox", group: "stage_io" },
    ],
    edges: [{ from: "piano", to: "rack", signal: "soundgrid" }],
  };
  test("appends generated devices inside the parent and keeps the rest", () => {
    const { graph, renamed, added } = mergeInternalWiring(
      structuredClone(current) as never,
      "piano",
      {
        nodes: [
          { id: "midi_kb", label: "MIDI keyboard", type: "source", group: "keys" },
          { id: "rack", label: "Adapter", type: "interface", group: "keys" },
          { id: "laptop", label: "Laptop", type: "computer", group: "keys", parent: "piano" },
        ],
        edges: [
          { from: "midi_kb", to: "rack", signal: "usb", cable: "USB Type B" },
          { from: "rack", to: "laptop", signal: "usb" },
          { from: "laptop", to: "rack", signal: "soundgrid", cable: "Cat 6" },
        ],
      } as never,
    );
    expect(added).toBe(3);
    expect(renamed).toEqual({ rack: "rack_2" });
    expect(graph.nodes.map((n) => `${n.id}:${n.parent ?? "-"}`)).toEqual([
      "piano:-",
      "rack:-",
      "midi_kb:piano",
      "rack_2:piano",
      "laptop:piano",
    ]);
    expect(graph.edges.map((e) => `${e.from}>${e.to}`)).toEqual([
      "piano>rack",
      "midi_kb>rack_2",
      "rack_2>laptop",
      "laptop>rack_2",
    ]);
    expect(validateGraph(graph)).toEqual([]);
    const main = viewGraph(graph, null);
    expect(main.edges.map((e) => `${e.from}>${e.to}`)).toEqual(["piano>rack"]);
  });
});

test("mergeInternalWiring with replace swaps the old internals", () => {
  const current = {
    nodes: [
      { id: "piano", label: "Piano", type: "playback", group: "keys" },
      { id: "old_kb", label: "Old", type: "source", group: "keys", parent: "piano" },
      { id: "rack", label: "Rack", type: "stagebox", group: "stage_io" },
    ],
    edges: [{ from: "old_kb", to: "rack", signal: "soundgrid" }],
  } as never;
  const { graph } = mergeInternalWiring(
    current,
    "piano",
    {
      nodes: [{ id: "laptop", label: "Laptop", type: "computer", group: "keys" }],
      edges: [{ from: "laptop", to: "rack", signal: "soundgrid" }],
    } as never,
    { replace: true },
  );
  expect(graph.nodes.map((n) => n.id)).toEqual(["piano", "rack", "laptop"]);
  expect(graph.edges).toEqual([{ from: "laptop", to: "rack", signal: "soundgrid" }]);
});
