import { describe, expect, test } from "bun:test";
import {
  describeWiring,
  diffWiring,
  normalizeAiGraph,
  parseWiringYaml,
  validateGraph,
  wiringToYaml,
  type WiringGraph,
} from "../shared/wiring";
import {
  parsePitfalls,
  parseRunbookSteps,
  pitfallsTouching,
  recordPitfallFix,
  validatePitfallRefs,
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
