# V1 ProdBot

Production-team documentation and troubleshooting for V1 Church campuses.

Live app: https://v1church-prodbot.vercel.app
Built with Vite, React, TypeScript, Convex, and the OpenAI Responses API.

## Use

On first load you pick a campus. After that the app is a single workspace: a
left sidebar headed "V1 <campus>" (new chat, Ask / Explore / Admin, and
that campus's chats) next to the main view. "Switch campus" in the top right
returns to the picker. Chat UI pieces come
from [ElevenLabs UI](https://ui.elevenlabs.io) (conversation, response,
shimmering text) on top of shadcn/ui.

- **Ask:** streamed answers grounded in approved campus and shared documentation. While the model works, its reasoning summary streams into a collapsible "Thinking" block above the answer.
- **Explore:** the campus wiring diagram: device search, group visibility, fullscreen, PNG export, hover details, and double-click into a device's internal wiring.
- **Admin:** three cards. "Add common pitfalls documentation" takes pasted notes or TXT/PDF uploads, generates an AI draft, shows it against the approved version, and lets you approve, discard, or edit by hand. "Add / update wiring diagram" has no notes box: "Edit diagram" (or clicking a device or connection line in the preview, or "Build diagram" when there is none yet) opens a full-screen workspace with the campus canvas on the left and, on the right, a chat that draws the diagram from a description ("Drums are on stage box A…", "the playback Mac now goes over Dante", "remove the demo box") plus the form for the selected device. A device owns its connections: the form lists what feeds it and what it feeds, each expandable to set the cable, signal, port and channel, with "Add input" / "Add output" buttons that ask which device before creating anything; clicking a connection line opens the device it belongs to with that connection expanded. A new device is added by name and starts unconnected; the only inferred connection is from the "+" beside a device on the canvas, which wires the new device to that one. A device can carry its own internal wiring: hover it and press "+" to open the workspace focused inside it, where the chat draws that device's complete internal wiring. Chat messages are kept on file as wiring notes for the other documents to draw on. Nothing is stored until "Save changes", which writes the whole diagram with a revision. The main diagram keeps a device with internal wiring as one node with an "N inside" badge and collapses connections leaving the group onto it; double-clicking opens the internal wiring as its own canvas, like opening a folder: only the devices inside are drawn. Anything outside that connects in appears as a small "from …" / "to …" pill at the edge, and a connection attached to the group itself shows as a pill with nothing wired to it yet so it can be reattached to the right device inside. Stored YAML stays flat: nested devices carry a `parent:` id, so pitfall references and device ids do not change. Connections carry a cable type (XLR, Cat 6, USB Type A/B/C, or free text). The pitfalls card has "Edit pitfalls": each entry is the issue, what is actually wrong, and the solution, with optional devices, check steps, and last-seen. Older "likely causes" / "fix" entries load into the same form and are rewritten as "issue" / "solution" on save. "Add documentation link" is a title-plus-URL form that writes to the shared links document. A collapsed "More" section holds the runbook, systems, glossary, reported-fix review, import/export, and clear-campus tools.

There is no user authentication or password gate. Admin is a view-switch button.
Conversations and checklists are shared within each campus, as requested for this MVP.

## Local development

```sh
bun install
cp .env.example .env.local
# Set the deployment and frontend URL in .env.local.
bunx convex dev --once
bun run dev
```

The configured cloud development deployment is `marvelous-toad-270` in
`kyle-anthony-hay-64c08/v1curch-prodbot`. Cloud development supports the Node
runtimes used for AI and PDF extraction. Local Convex Node actions require a
supported Node version (20, 22, or 24).

### AI configuration

Set **OPENAI_API_KEY** in the Convex deployment's Settings → Environment Variables.
The key belongs only in Convex; never use a `VITE_` prefix for it or add it to Vercel's frontend build variables.

Optional deployment variables:

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_MODEL` | `gpt-5.6-luna` | OpenAI model for chat and generation |
| `AGENT_EFFORT` | `medium` | Chat reasoning effort |
| `GENERATE_EFFORT` | `high` | Document-generation reasoning effort |

Effort values: `none`, `low`, `medium`, `high`, `xhigh`, `max`.
Luna supports a 1.05M-token context window and up to 922K input tokens
([model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna)).
The app caps combined prompts at 800K UTF-8 bytes, history at 48K characters,
and output at 8K tokens for chat / 32K for generation. Responses use `store: false`.
Usage logs contain model and token counts, including `cachedTokens`; they do not log API keys.

## Document review

1. Add campus sources in Admin. Scanned/image-only PDFs need pasted text because OCR is not included.
2. Generate a document, or use **Generate all drafts** for wiring → pitfalls → runbook → systems.
3. Review the wiring diagram, assumptions, source attribution, and affected pitfalls/runbook steps.
4. Approve wiring before dependent drafts. A dependent draft records the exact wiring used to generate it.
5. Non-wiring drafts display approved and proposed content side by side.
6. Approval preserves the previous version as a revision. A draft cannot overwrite approved content that changed after generation started.

A volunteer can report a resolved pitfall in chat. The model can submit a proposal
with the original volunteer report attached by the server as evidence. Admin reviews it before the `last seen`
field changes; approval preserves a revision.

### Backups and imports

**Export approved docs** downloads a ZIP containing `wiring.yaml`, `pitfalls.md`,
`runbook.md`, and `systems.md`. Shared exports contain `links.md` and `glossary.md`.
Unzip into a Git repository for file-based backups.

Import those YAML/markdown files using their exact names. All files are validated
and imported atomically as drafts; approved content remains intact until review.
An existing draft must be reviewed or discarded before importing that kind.
Exports contain approved documentation, not raw uploads, draft history, or chats.
Use Convex backups for a full database backup.

**Clear campus documentation** removes documents, drafts, revisions, uploads,
checklists, and fix reviews after campus-name confirmation. It keeps the campus
entry and conversations. Individual document deletion also removes its revisions.

## Checks

```sh
bun run typecheck
bun test
bun run build
```

CI runs all three checks on pushes to `main`/`master` and pull requests.
`tests/` covers graph parsing/diffing, document parsers, context budgeting,
imports, revision preservation, stale approvals, generation locks, checklists,
and evidence-backed fix review using `convex-test` under Bun.

Optional development-only checks:

```sh
bun scripts/smoke.ts           # paste/TXT/PDF extraction; removes its uploads
bun scripts/preview-fixture.ts # only seeds an empty Brooklyn development campus
bun scripts/ai-smoke.ts        # requires key + preview fixture; exercises live Luna
bun scripts/review-smoke.ts    # validates approval and chat fix review
bun scripts/cleanup-fixtures.ts # removes only the recorded verification fixtures
```

The AI/browser fixture scripts create clearly labeled fictional documentation.
They are not actual V1 Church production instructions. See `VERIFICATION.md` for
current verification results and limitations.

## Hosting

1. `bunx convex deploy` pushes the backend to this project's production deployment.
2. Set `OPENAI_API_KEY` and `AGENT_MODEL=gpt-5.6-luna` on that production deployment.
3. Deploy the Vite frontend to Vercel with **VITE_CONVEX_URL** set to the production Convex URL.
4. Backend changes require another Convex deployment. Vercel builds alone do not deploy Convex.

`vercel.json` defines the Bun install and Vite build commands.

## Layout

- `convex/ai.ts`: OpenAI chat, structured wiring output, ordered generation.
- `convex/documents.ts`: drafts, revisions, imports and deletion.
- `convex/checklist.ts`: campus/date checklist persistence.
- `convex/fixes.ts`: reported-fix review queue.
- `shared/`: pure graph, document, backup and history helpers.
- `src/views/`, `src/admin/`, `src/components/`: UI.
