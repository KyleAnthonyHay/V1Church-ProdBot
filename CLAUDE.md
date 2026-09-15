# V1 ProdBot

React + TypeScript (Vite), Convex backend, OpenAI Responses API, Bun tooling.
Read README.md for setup and VERIFICATION.md for evidence and remaining limitations.

## Commands
- `bun run dev`: frontend
- `bunx convex dev --once`: push to configured cloud development deployment
- `bun run typecheck`, `bun test`, `bun run build`: required checks

## Conventions
- `shared/` holds pure logic used by server and client. No React or Convex imports.
- `"use node"` Convex files export actions only.
- No user auth or admin password gate; Admin is a view switch. Do not reintroduce auth unless requested.
- OpenAI secrets live in Convex deployment environment variables, never the frontend.
- Model defaults to `gpt-5.6-luna`. Chat and generation reasoning are independently configurable.
- One document per `(campusId, kind)`; undefined campus means shared.
- Campus kinds: wiring, pitfalls, runbook, systems. Shared kinds: links, glossary.
- Node IDs are stable snake_case. Wiring diffs include connection cable and notes changes.
- Generated/imported content is a draft until explicitly approved. Preserve revisions and check stale draft/wiring dependencies.
- Chat writes streaming message snapshots to Convex; histories are bounded.
- Reported fixes require a verbatim volunteer quote and review before document changes.
- Heavy views, diagrams, markdown and exports are loaded on demand.
- Never present fictional fixtures as real campus documentation. Smoke scripts are development-only.
