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
    type: source           # source | stagebox | network | console | server | processor | amp | speaker | playback | computer | interface | wireless | iem | monitor | video | other
    group: drums           # drums | bass | guitars | keys | vocals | playback | video | stage_io | network | foh | pa | monitors | broadcast | lighting | other
    model: Shure Beta 91A  # optional
    location: drum riser   # optional
    notes: ...             # optional
edges:
  - from: kick_in
    to: stagebox_a
    signal: analog_mic     # analog_mic | analog_line | aes | dante | soundgrid | usb | midi | network | speaker | hdmi | sdi | osc | rf | other
    cable: XLR             # optional
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
    template: `## P-001: Symptom as someone would say it on Sunday
- symptom: One sentence in the words a volunteer would use.
- nodes: [playback_mac, stagebox_a, lv1_foh]
- likely causes:
  1. Most likely cause first.
  2. Next.
- check:
  1. What to look at, in order, closest to the symptom first.
- fix: What actually resolves it.
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
    title: "Glossary",
    description:
      "Team vocabulary so the agent can map casual wording to the documented systems.",
    format: "markdown",
    template: `- **FOH** - front of house, the mix position and the engineer there.
- **IEM / ears / pack** - in-ear monitors.
- **Click** - the metronome from playback, IEM only.
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
