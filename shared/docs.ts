// Document kinds, their formats, and parsers for the markdown docs.

export const CAMPUS_DOC_KINDS = [
  "wiring",
  "pitfalls",
  "runbook",
  "systems",
] as const;
export const SHARED_DOC_KINDS = ["links", "glossary"] as const;
export type CampusDocKind = (typeof CAMPUS_DOC_KINDS)[number];
export type SharedDocKind = (typeof SHARED_DOC_KINDS)[number];
export type DocKind = CampusDocKind | SharedDocKind;

export interface DocMeta {
  title: string;
  description: string;
  format: "yaml" | "markdown";
  /** Format the AI is asked to produce and admins are shown as a reference. */
  template: string;
}

export const DOC_META: Record<DocKind, DocMeta> = {
  wiring: {
    title: "Wiring graph",
    description:
      "Every device and every connection, as YAML. The diagram is drawn from this and pitfalls reference its node ids.",
    format: "yaml",
    template: `nodes:
  - id: kick_in            # stable snake_case id
    label: Kick In
    type: source           # source | stagebox | network | console | server | processor | amp | speaker | playback | computer | interface | wireless | iem | monitor | video | subsystem | other
    group: drums           # drums | bass | guitars | keys | vocals | playback | video | stage_io | network | foh | pa | monitors | broadcast | lighting | other
    model: Shure Beta 91A  # optional
    location: drum riser   # optional
    notes: ...             # optional
    parent: foh            # optional: this device lives inside the "foh" sub-diagram (double-click foh to open it)
edges:
  - from: kick_in
    to: stagebox_a
    signal: analog_mic     # analog_mic | analog_line | aes | dante | soundgrid | usb | midi | network | speaker | hdmi | sdi | osc | rf | other
    cable: XLR             # XLR | Cat 6 | USB Type A | USB Type B | USB Type C | other
    port: "A in 1"         # optional, jack on the destination
    channel: "LV1 ch 1"    # optional, where it lands on the console
    notes: 48V on          # optional
`,
  },
  pitfalls: {
    title: "Sunday pitfalls",
    description:
      "Symptom-first troubleshooting. Each entry names the wiring node ids on the chain so the agent can walk it.",
    format: "markdown",
    template: `## P-001: The problem as someone would say it on Sunday (e.g. Everything from FOH sounds glitchy)
- nodes: [lv1_foh, stage_rack_3]
- issue: What is actually wrong (e.g. the LV1 master clock is not synced to the stage rack).
- check:
  1. What to look at, in order, closest to the symptom first.
- solution: What resolves it (e.g. set the LV1 master clock to Stage Rack 3).
- last seen: 2026-09-14 (who fixed it, what it turned out to be)
`,
  },
  runbook: {
    title: "Sunday runbook",
    description:
      "Setup in order. Owner, what done looks like, and which pitfall to open if it is not.",
    format: "markdown",
    template: `| # | Time | Owner | Step | Done when | If not |
|---|---|---|---|---|---|
| 1 | 6:30 | Production lead | Power on switch, stage boxes, server, then console host | All switch ports show link | P-001, P-002 |

## Teardown / strike
1. ...
`,
  },
  systems: {
    title: "Systems and links",
    description:
      "What is in this room: model, firmware, IP, rack position, where the login lives (never the password), and campus-specific links.",
    format: "markdown",
    template: `| System | Role | Model / version | Location | Network | Links | Notes |
|---|---|---|---|---|---|---|
| Console | FOH mix | Waves eMotion LV1 v15 | FOH | SoundGrid | [LV1 manual](https://...) | Session file lives in Dropbox |

## Network map
| Device | IP | Switch port | Notes |
|---|---|---|---|

## Logins and access
| System | Where the credential lives | Who has access |
|---|---|---|
`,
  },
  links: {
    title: "Shared product docs and links",
    description:
      "Manuals and vendor links that are the same at every campus (LV1, SoundGrid, Ableton, Shure, ProPresenter).",
    format: "markdown",
    template: `## Waves eMotion LV1
- Product page: https://www.waves.com/mixers-racks/emotion-lv1
- Support: https://www.waves.com/support
- What to know: if the SoundGrid server is unassigned the UI keeps running but audio stops.

## Ableton Live playback
- Manual: https://www.ableton.com/en/manual/
`,
  },
  glossary: {
    title: "Terminology",
    description:
      "Team vocabulary so the agent can map casual wording to the documented systems.",
    format: "markdown",
    template: `## Ears
- Technical term: In-ear monitors (IEM)
- Refers to: The Shure PSM1000 bodypacks the band wears on stage
- Description: Wireless in-ear headphones carrying each musician's monitor mix.

## Click
- Technical term: Metronome track
- Refers to: The click from the playback Mac, out 3 on the Clarett
- Description: Tempo pulse sent only to the IEM auxes, never the house.
`,
  },
};

export interface Pitfall {
  id: string;
  title: string;
  nodes: string[];
  body: string;
}

/** Parse "## P-001: Title" sections and their "- nodes: [a, b]" line. */
export function parsePitfalls(md: string): Pitfall[] {
  const out: Pitfall[] = [];
  const sections = md.split(/^(?=## )/m);
  for (const section of sections) {
    const m = section.match(/^## +(P-\d+)\s*:\s*(.+)$/m);
    if (!m) continue;
    const nodesLine = section.match(/^\s*[-*]\s*nodes\s*:\s*\[([^\]]*)\]/m);
    const nodes = nodesLine
      ? nodesLine[1]!
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean)
      : [];
    out.push({ id: m[1]!, title: m[2]!.trim(), nodes, body: section.trim() });
  }
  return out;
}

/** One pitfall broken into fields for the structured editor. */
export interface PitfallDetail {
  id: string;
  title: string;
  nodes: string[];
  /** What is actually wrong (older docs call this "likely causes"). */
  issue: string;
  /** Ordered things to look at. */
  check: string[];
  /** What resolves it (older docs call this "fix"). */
  solution: string;
  /** Kept verbatim; written by the reported-fix review flow. */
  lastSeen?: string;
  /** "- symptom:" line from older docs, kept only if it differs from the title. */
  symptom?: string;
  /** Lines under keys the editor does not know, preserved on save. */
  extra: string[];
}

const PITFALL_KEYS: Record<string, keyof PitfallDetail> = {
  symptom: "symptom",
  nodes: "nodes",
  issue: "issue",
  cause: "issue",
  causes: "issue",
  "likely cause": "issue",
  "likely causes": "issue",
  check: "check",
  checks: "check",
  fix: "solution",
  solution: "solution",
  "last seen": "lastSeen",
};

function splitNodes(text: string): string[] {
  return text
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

/** Parse one "## P-xxx: Title" section into fields. Unknown lines survive in `extra`. */
export function parsePitfallDetail(section: string): PitfallDetail | null {
  const lines = section.split("\n");
  const head = lines.findIndex((l) => /^## +P-\d+\s*:/.test(l));
  if (head < 0) return null;
  const m = lines[head]!.match(/^## +(P-\d+)\s*:\s*(.*)$/)!;
  const d: PitfallDetail = {
    id: m[1]!,
    title: m[2]!.trim(),
    nodes: [],
    issue: "",
    check: [],
    solution: "",
    extra: [],
  };
  let current: keyof PitfallDetail | "extra" | null = null;
  const textParts: Partial<Record<"issue" | "solution" | "symptom" | "lastSeen", string[]>> = {};
  for (const raw of lines.slice(head + 1)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const key = line.match(/^\s*[-*]\s*([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/);
    if (key) {
      const field = PITFALL_KEYS[key[1]!.trim().toLowerCase()];
      const value = key[2]!.trim();
      if (field === "nodes") {
        d.nodes = splitNodes(value);
        current = "nodes";
      } else if (field === "check") {
        current = "check";
        if (value) d.check.push(value);
      } else if (
        field === "issue" ||
        field === "solution" ||
        field === "symptom" ||
        field === "lastSeen"
      ) {
        current = field;
        textParts[field] = value ? [value] : [];
      } else {
        current = "extra";
        d.extra.push(line.trim());
      }
      continue;
    }
    const item = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.*)$/);
    const text = (item ? item[1]! : line).trim();
    if (current === "check") d.check.push(text);
    else if (
      current === "issue" ||
      current === "solution" ||
      current === "symptom" ||
      current === "lastSeen"
    )
      (textParts[current] ??= []).push(text);
    else d.extra.push(line.trim());
  }
  d.issue = (textParts.issue ?? []).join("\n");
  d.solution = (textParts.solution ?? []).join("\n");
  const symptom = (textParts.symptom ?? []).join(" ");
  if (symptom && symptom !== d.title) d.symptom = symptom;
  const lastSeen = (textParts.lastSeen ?? []).join(" ");
  if (lastSeen) d.lastSeen = lastSeen;
  return d;
}

/** Split a pitfalls document into its preamble and structured entries. */
export function parsePitfallDetails(md: string): {
  preamble: string;
  pitfalls: PitfallDetail[];
} {
  const sections = md.split(/^(?=## )/m);
  const pitfalls: PitfallDetail[] = [];
  const rest: string[] = [];
  for (const section of sections) {
    const d = parsePitfallDetail(section);
    if (d) pitfalls.push(d);
    else if (section.trim()) rest.push(section.trim());
  }
  return { preamble: rest.join("\n\n"), pitfalls };
}

function multiline(key: string, value: string): string {
  const [first = "", ...more] = value.split("\n").map((l) => l.trim());
  return [`- ${key}: ${first}`, ...more.filter(Boolean).map((l) => `  ${l}`)].join(
    "\n",
  );
}

export function pitfallToMarkdown(d: PitfallDetail): string {
  const lines = [`## ${d.id}: ${d.title.trim()}`];
  if (d.symptom) lines.push(`- symptom: ${d.symptom}`);
  lines.push(`- nodes: [${d.nodes.join(", ")}]`);
  if (d.issue.trim()) lines.push(multiline("issue", d.issue.trim()));
  if (d.check.length) {
    lines.push("- check:");
    d.check.forEach((c, i) => lines.push(`  ${i + 1}. ${c.trim()}`));
  }
  if (d.solution.trim()) lines.push(multiline("solution", d.solution.trim()));
  if (d.lastSeen) lines.push(`- last seen: ${d.lastSeen}`);
  lines.push(...d.extra);
  return lines.join("\n") + "\n";
}

export function pitfallsToMarkdown(
  pitfalls: PitfallDetail[],
  preamble = "",
): string {
  const parts = [preamble.trim(), ...pitfalls.map(pitfallToMarkdown)].filter(
    Boolean,
  );
  return parts.join("\n\n");
}

/** Next free id after the highest P-xxx in the list. */
export function nextPitfallId(pitfalls: { id: string }[]): string {
  const max = pitfalls.reduce(
    (n, p) => Math.max(n, Number(p.id.replace(/^P-/, "")) || 0),
    0,
  );
  return `P-${String(max + 1).padStart(3, "0")}`;
}

export interface RunbookStep {
  time: string;
  owner: string;
  doneWhen: string;
  number: string;
  step: string;
  pitfalls: string[];
}

/** Parse runbook table rows: | # | Time | Owner | Step | Done when | If not | */
export function parseRunbookSteps(md: string): RunbookStep[] {
  const out: RunbookStep[] = [];
  for (const line of md.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 6 || !/^\d+$/.test(cells[0] ?? "")) continue;
    out.push({
      number: cells[0]!,
      time: cells[1] ?? "",
      owner: cells[2] ?? "",
      doneWhen: cells[4] ?? "",
      step: cells[3] ?? "",
      pitfalls: (cells[5] ?? "").match(/P-\d+/g) ?? [],
    });
  }
  return out;
}

/** Pitfall ids whose node list or body mentions any of the given node ids. */
export function pitfallsTouching(
  pitfalls: Pitfall[],
  nodeIds: string[],
): Pitfall[] {
  const ids = new Set(nodeIds);
  return pitfalls.filter(
    (p) =>
      p.nodes.some((n) => ids.has(n)) ||
      nodeIds.some((id) =>
        new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
          p.body,
        ),
      ),
  );
}

/** Issues: pitfall node references that do not exist in the wiring graph. */
export function validatePitfallRefs(
  pitfalls: Pitfall[],
  nodeIds: Set<string>,
): string[] {
  const issues: string[] = [];
  for (const p of pitfalls)
    for (const n of p.nodes)
      if (!nodeIds.has(n))
        issues.push(`${p.id} references unknown node "${n}"`);
  return issues;
}

export function stripCodeFence(text: string): string {
  const m = text.trim().match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return m ? m[1]! : text.trim();
}

/** Update exactly one documented pitfall; never create or silently rename one. */
export function recordPitfallFix(
  content: string,
  pitfallId: string,
  date: string,
  note: string,
): string {
  if (!/^P-\d+$/.test(pitfallId)) throw new Error("Invalid pitfall id");
  const sections = content.split(/^(?=## )/m);
  const matches = sections
    .map((s, i) => (s.match(new RegExp(`^## +${pitfallId}\\s*:`)) ? i : -1))
    .filter((i) => i >= 0);
  if (matches.length !== 1)
    throw new Error(
      "Pitfall is missing or duplicated; edit the document first",
    );
  const index = matches[0]!;
  const line = `- last seen: ${date} (${note.replace(/[\r\n]+/g, " ").trim()})`;
  sections[index] = /^\s*[-*]\s*last seen\s*:/m.test(sections[index]!)
    ? sections[index]!.replace(/^\s*[-*]\s*last seen\s*:.*$/m, line)
    : sections[index]!.trimEnd() + "\n" + line + "\n\n";
  return sections.join("");
}
