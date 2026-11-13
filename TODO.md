# V1 ProdBot status

Updated 2026-09-15. See README.md for setup and VERIFICATION.md for evidence.

## Implemented

- [x] Cloud development and production Convex deployments with generated types.
- [x] OpenAI Responses API using GPT-5.6 Luna, streamed chat and structured wiring.
- [x] Simple Admin view button without user authentication, as requested.
- [x] Side-by-side markdown drafts, source attribution, stale-draft protection and revisions.
- [x] Ordered generation of wiring, pitfalls, runbook and systems.
- [x] Campus/date runbook checklist and reviewed chat fix proposals.
- [x] Device search, group controls, device YAML, fullscreen and PNG export controls.
- [x] Documentation import/export, individual deletion and campus clearing.
- [x] Sidebar + chat workspace layout (2026-09-15 redesign), collapsible on desktop and mobile, light/dark theme switch.
- [x] Streamed reasoning summaries shown as a collapsible "Thinking" block in chat.
- [x] Unit/backend tests, context budgets, lazy-loaded views and markdown rendering.
- [x] CI configuration and production frontend hosting on Vercel.

## Remaining manual verification

- [ ] Check the phone layout on an actual phone-sized viewport/device.
- [ ] Confirm the generated diagram PNG saves and opens in a normal browser download workflow.
- [ ] Add real campus sources and have the production team validate the resulting signal chains.

## Optional later work

- OCR for image-only PDFs and chunking/summarization for sources beyond the current size guard.
- Timer-based streaming flushes if measurements show latency from inline mutations.
- Refresh copied UI components from their registry when available.
- Authentication only if product requirements change; it is intentionally absent now.
