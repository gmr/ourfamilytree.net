# CLAUDE.md

Guidance for Claude Code in this repository.

## Overview

The Kent and Kint Records Map (ourfamilytree.net): a public map of about 1,040 historical Kent/Kint/Kindt
records in northern New Jersey, plus research (profiles, family groups, record assignments) kept in
PostgreSQL. The site is read-only. Administrators change research only through the MCP server, from
Claude. PRD and design: `plans/` (local only, gitignored).

## Commands

```bash
just db                      # local Postgres on :5442 (copy .env.example to .env first)
just seed                    # load seed/ into the database (safe to re-run)
just serve                   # site + MCP on :8080
just ci                      # fmt-check, clippy -D warnings, unit tests
just smoke                   # MCP end-to-end test (server must run with DEV_LOGIN_EMAIL set)
just parity                  # By-year rows and map SVG of the running site vs the v114 page
```

## Architecture

- **The front end is the v114 page itself.** `tools/extract/split.mjs` cut the single-file page into
  `frontend/index.html` (markup and CSS) and `frontend/app.js` (its script without the data literals).
  The data literals live in the `dataset` table, and `/data.js` writes them back as `const X=...;`
  plus `const RESEARCH=...` (published research only). Classic scripts share one global scope, so
  `app.js` runs unchanged. This is what gives exact parity with the original page.
- `frontend/app.js` and `frontend/index.html` are now source code (edited for: research from the
  server, no admin UI, the MCP App hook `window.__oftResearch`). Re-running `just split` overwrites them.
- **Key order matters.** `dataset.value` is `json`, not `jsonb`, and serde_json has `preserve_order`;
  the page iterates object keys. Do not change either.
- `record` holds one row per distinct By-year row, keyed by the page's own row id (`legacy_hash`,
  PRD §7.1) taken from the rendered page (`tools/extract/records.mjs`). Research links to records by
  UUID; the browser sees the legacy hash.
- Crates: `oft-domain` (data.js writer, research JSON v1/v2, validation), `oft-db` (sqlx runtime
  queries, migrations in `crates/oft-db/migrations`), `oft-api` (Axum server, CLI, OAuth, MCP).
- MCP: `rmcp` streamable HTTP at `/mcp`, behind `auth::require_bearer`. The app is its own OAuth 2.1
  server (DCR + PKCE + refresh rotation), signs people in with Google, then shows a consent page
  naming the client. Only emails in `ADMIN_EMAILS` may sign in, and every MCP call re-checks it. `DEV_LOGIN_EMAIL` skips Google and is refused unless `BASE_URL` is localhost.
- Every MCP write: one transaction, an `audit_log` row, then `AppState::invalidate()` so data.js is
  rebuilt. Destructive tools require `confirm: true`.
- The `preview` tool is an MCP App (`ui://ourfamilytree/preview.html`): the whole page inlined, with
  research (drafts included) delivered in the tool result.

## Rules

- Records are never edited by research tools (PRD §4). `record.status` is soft delete only.
- Never infer kinship or identity in code. No living people (dates after 1900 need a confirmation).
- Rust edition 2024.
