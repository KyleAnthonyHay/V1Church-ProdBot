# Verification — 2026-09-15

## Deployments

- Frontend: https://v1church-prodbot.vercel.app (Vercel production deployment READY).
- Production Convex: `tremendous-herring-22`.
- Development Convex: `marvelous-toad-270`.
- Both backends use `AGENT_MODEL=gpt-5.6-luna`; the API key is configured only in Convex.
- Safari displayed the deployed Explore view, Brooklyn selector, Admin button and expected empty documentation state.
- Production chat completed with an accurate no-documentation response. Its verification conversation was removed.

Vercel builds pin Bun 1.4.2 because the default older Bun could not read this lockfile.
Frontend deployment does not deploy Convex functions; deploy backend changes separately.

## Automated checks

`bun run typecheck`, `bun test` and `bun run build` passed.
Bun reported **18 passing tests, 0 failures, 55 assertions**.
Coverage includes graph validation/diffing, document parsing, import validation,
revision preservation, dependent/stale draft approval, generation locking,
checklist dates, fix-review evidence, history budgets and missing-key errors.
The largest generated JavaScript chunk is approximately 494 KB; heavy views and markdown are lazy-loaded.

## Live development checks

- Pasted sources, TXT upload and text PDF extraction succeeded. A blank PDF produced a readable no-text error; an actual scanned-image PDF was not tested.
- Luna generated all four document drafts in order with source IDs, valid five-device wiring and valid pitfall node references.
- Streamed chat produced partial content and completed with device/pitfall references.
- Prompt caching was observed: one chat reported 1,384 cached input tokens.
- Wiring and dependent drafts were approved; chat proposed a fix and review updated its last-seen field while retaining revisions.
- Fix evidence is copied by the server from the volunteer message, avoiding model paraphrases being treated as exact quotes.
- Browser checks covered diagram rendering, device search/selection/YAML, group visibility, fullscreen controls, checklist persistence and draft comparison/provenance.

The clearly fictional Brooklyn fixtures, source uploads and verification conversations were removed after testing. Production received no fictional documentation.
Scripts in `scripts/` reproduce these development checks and use ignored `.verification/` manifests for cleanup ownership checks.

## Limits of this verification

- The browser viewport override did not actually resize the page. Phone layout remains a manual check.
- PNG generation produced a download link, but the browser automation download event did not complete. Opening its blob URL was blocked by browser security policy; no workaround was attempted. Saving/opening the final PNG remains unverified.
- Actual campus hardware and real documentation have not been validated by the production team.
- Image-only PDFs require pasted text; OCR and oversized-source summarization are not implemented.
- CI is configured locally; this report does not claim a GitHub Actions run.
