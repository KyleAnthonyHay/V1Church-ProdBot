import { describeWiring, parseWiringYaml } from "../../shared/wiring";
import { DOC_META, type DocKind } from "../../shared/docs";

export interface PromptDoc {
  kind: DocKind;
  content: string;
}

const KIND_ORDER: DocKind[] = [
  "wiring",
  "pitfalls",
  "runbook",
  "systems",
  "links",
  "glossary",
];

export function buildAgentSystemPrompt(
  campusName: string,
  campusDocs: PromptDoc[],
  sharedDocs: PromptDoc[],
): string {
  const docs = [...campusDocs, ...sharedDocs]
    .filter((d) => d.content.trim())
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

  const campusHasDocs = campusDocs.some((d) => d.content.trim());

  const parts: string[] = [];
  parts.push(`You are ProdBot, the production assistant for V1 Church. You help volunteers and engineers set up and troubleshoot Sunday morning production at the ${campusName} campus.

How to work:
- You know only what is in the documents below. Never invent port numbers, channel numbers, IP addresses, model names, or steps. If something is not documented, say so plainly and tell the user what an admin should add.
- Be symptom-first. When someone describes a problem, name the most likely cause and the first thing to check, then the rest in order. Numbered steps, short sentences. People read this on a phone with a service about to start.
- When troubleshooting, walk the documented signal chain: name each device between where the signal starts and where it should arrive, and say what to check at each hop, starting closest to the symptom.
- Cite what you used: pitfall ids like P-003, runbook step numbers, and device ids from the wiring graph.
- Ask at most one clarifying question, and only when the answer changes the first thing to check.
- If a pitfall's "last seen" note says what fixed it before, lead with that.`);

  if (!campusHasDocs) {
    parts.push(
      `\nIMPORTANT: No documentation has been added for the ${campusName} campus yet. Tell the user this up front in one sentence, answer with general production knowledge only if they ask you to and make clear it is not campus-specific, and point them to the Admin view to add the wiring, pitfalls, runbook, and systems docs.`,
    );
  }

  for (const d of docs) {
    const meta = DOC_META[d.kind];
    parts.push(`\n<document kind="${d.kind}" title="${meta.title}">`);
    if (d.kind === "wiring") {
      const parsed = parseWiringYaml(d.content);
      if (parsed.graph) {
        parts.push(describeWiring(parsed.graph));
        parts.push("\nRaw YAML:\n" + d.content);
      } else {
        parts.push(d.content);
      }
    } else {
      parts.push(d.content);
    }
    parts.push("</document>");
  }

  return parts.join("\n");
}

export interface GenerationInput {
  kind: DocKind;
  campusName: string | null; // null = shared docs
  sources: { title: string; text: string }[];
  current: string;
  wiringYaml?: string; // for pitfalls / runbook so node ids line up
  instructions?: string;
  /** Wiring only: produce just the internal wiring of this device. */
  parentNode?: { id: string; label: string };
}

export function buildGenerationPrompt(input: GenerationInput): {
  system: string;
  user: string;
} {
  const meta = DOC_META[input.kind];
  const scope = input.campusName
    ? `the ${input.campusName} campus of V1 Church`
    : "all V1 Church campuses (shared material)";

  const system = `You convert a church production team's notes into structured documentation. You are producing the "${meta.title}" document for ${scope}.

What this document is: ${meta.description}

Rules:
- Use only facts present in the source material or the current document. Do not invent devices, ports, channels, IPs, or model numbers. When something is implied but not stated, include it and record the assumption.
- If a current version of the document exists, produce an UPDATED full version: keep everything not contradicted by the sources, keep existing ids stable, and merge in what the sources add or correct.
- Output the complete document, nothing else.`;

  const user: string[] = [];
  if (input.kind !== "wiring") {
    user.push(`Required format (follow it exactly):\n\n${meta.template}`);
  }
  if (input.wiringYaml?.trim()) {
    user.push(
      `The campus wiring graph. Any "nodes:" references must use these exact ids:\n\n${input.wiringYaml}`,
    );
  }
  if (input.parentNode) {
    user.push(
      `Existing wiring graph (context; do NOT output devices that are outside "${input.parentNode.label}", but reference their ids in edges):\n\n${input.current || "(empty)"}`,
    );
  } else if (input.current.trim()) {
    user.push(
      `Current version of the document (update it, keep ids stable):\n\n${input.current}`,
    );
  } else {
    user.push("There is no current version. Create it from the sources.");
  }
  if (input.sources.length === 0) {
    user.push("No source material was provided.");
  }
  for (const s of input.sources) {
    user.push(
      `<source title="${s.title.replace(/"/g, "'")}">\n${s.text}\n</source>`,
    );
  }
  if (input.instructions?.trim()) {
    user.push(`Admin instructions for this run: ${input.instructions.trim()}`);
  }
  if (input.kind === "wiring" && input.parentNode) {
    user.push(
      `Produce the COMPLETE internal wiring of the device "${input.parentNode.label}" (id ${input.parentNode.id}): every device that lives inside it and the connections between them. Devices already inside it appear in the existing graph with parent "${input.parentNode.id}"; keep them (same ids) unless the description says to change or remove them, and add what the description adds. Set parent to "${input.parentNode.id}" on every node you output. For the signal that leaves or enters the group, add an edge from the internal device that really carries it to the existing outside device id (for example the laptop -> the stage rack). Never output the parent device itself or any outside device as a node. Use snake_case ids that do not clash with outside devices. List in \`assumptions\` everything you inferred.`,
    );
  } else if (input.kind === "wiring") {
    user.push(
      "Produce the wiring graph. Every edge must reference node ids that exist in nodes. Prefer one node per physical device; a stage box with 16 inputs is one node with many edges into it. A device may have a `parent` when it sits inside a bigger unit that should stay one node on the main diagram (e.g. a laptop inside the playback rig). List in `assumptions` everything you inferred or could not determine.",
    );
  } else {
    user.push(`Produce the ${meta.title} document in ${meta.format} now.`);
  }
  return { system, user: user.join("\n\n") };
}
