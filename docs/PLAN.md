# CleanHashtags (formerly HashDetector) revamp plan

Rebuild HashDetector (2018 PHP + jQuery) as a TypeScript app on Cloudflare, with a React frontend.
Every step below is **one commit**. Steps are ordered so the app builds, lints and tests green after each one.

## Background (why the old approach is gone)

- The 2018 check scraped `instagram.com/explore/tags/<tag>` for `0 Posts` in the meta description. Logged-out pages are now an empty JS shell, and explore/tags redirects to login.
- `/popular/<tag>/` was calibrated on 2026-10-10 (28 tags) and is **not** a ban signal: 9/10 real niche tags and `#sunset` show "Page isn't available", while half of a 2020 "banned" list renders fine.
- Existing checkers (Ayrshare, PostEverywhere, RiteKit) use a **static curated list**. The only official live signal is the Instagram Graph API `ig_hashtag_search`, which returns a generic error for sensitive tags, limited to 30 unique tags per 7 days per Business/Creator account.

## Product approach

1. **Curated list with provenance.** Every tag has a status, a source and a `last_verified_at` date, and the UI shows how fresh a verdict is.
2. **Honest unknowns.** Tags not in the list return `unknown`, never a false "clear".
3. **Optional live verification later** through the Graph API with the user's own connected account; results feed back into the shared list. Only a stub interface is built in this plan.

Statuses: `banned` | `restricted` | `reported` (community-reported, unverified) | `clear` | `unknown`.

## Stack

| Concern       | Choice                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| Language      | TypeScript (strict) everywhere                                                               |
| Monorepo      | pnpm workspaces                                                                              |
| API           | Cloudflare Worker + [Hono](https://hono.dev), routes under `/api`                            |
| Data          | Cloudflare D1 (SQLite) for the list; KV for result cache                                     |
| Rate limiting | Workers Rate Limiting binding                                                                |
| Frontend      | React + Vite, served by the same Worker as static assets (single deploy)                     |
| Validation    | Zod schemas shared by API and web                                                            |
| Tests         | Vitest; `@cloudflare/vitest-pool-workers` for the API, React Testing Library + jsdom for web |
| Lint/format   | ESLint (flat config) + Prettier                                                              |
| CI            | GitHub Actions + Dependabot                                                                  |

Layout:

```
apps/api       Worker (Hono, D1, KV) — also serves apps/web/dist as assets
apps/web       React + Vite
packages/shared  hashtag parsing + Zod schemas
docs/          PLAN.md, adr/, learning/
```

## Conventions

- Conventional commit messages (`feat(api): …`, `chore: …`, `docs(learning): …`).
- Before every commit: `pnpm lint && pnpm typecheck && pnpm test` pass.
- Use current stable versions installed via `pnpm add` (no hand-pinned old majors).
- Every frontend step adds a short note in `docs/learning/NN-topic.md`: the React concepts introduced, where they appear in the code (file:line), and one or two "try this" exercises.
- Nothing is pushed until the owner reviews the branch.

---

## Milestone 0 — Foundation

**Step 1 — `chore: remove legacy PHP app`**
Delete `index.php`, `main.html`, `.htaccess`, `composer.json`, `vendor/`, `css/`, `js/`, `img/`. Replace README with a one-paragraph "being rebuilt, see docs/PLAN.md" stub.
_Done when:_ only README and docs remain.

**Step 2 — `chore: set up pnpm workspace and tooling`**
Root `package.json` (private, `packageManager` field, scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict), `.nvmrc` (Node 22), `.editorconfig`, `.gitignore`, Prettier, ESLint flat config with typescript-eslint and react-hooks plugin. Empty `apps/` and `packages/` placeholders as needed so scripts run.
_Done when:_ `pnpm install && pnpm lint && pnpm typecheck` succeed.

**Step 3 — `docs: add revamp plan and stack ADR`**
Commit this file and `docs/adr/0001-stack-and-data-source.md` (context: dead scraping signal + calibration results; decision: curated list + Cloudflare/TS/React; consequences).

## Milestone 1 — Shared package

**Step 4 — `feat(shared): hashtag parser`**
`packages/shared`: `parseHashtags(input: string)` splits on whitespace/commas/newlines, strips leading `#`, lowercases (NFKC), dedupes preserving order, validates Instagram charset (letters incl. unicode, digits, `_`; not all digits; ≤ 100 chars), returns `{ tags, invalid }`. Constant `MAX_TAGS = 30`. Thorough unit tests (empty input, double spaces, emoji, duplicates, `##tag`, unicode).

**Step 5 — `feat(shared): check API schemas`**
Zod schemas + inferred types: `CheckRequest { hashtags: string[] (1..30) }`, `HashtagStatus` enum, `CheckResult { hashtag, status, source?, lastVerifiedAt? }`, `CheckResponse { results, checkedAt }`, `ApiError`. Tests for valid/invalid payloads.

## Milestone 2 — API (Worker)

**Step 6 — `feat(api): Hono worker skeleton`**
`apps/api` with `wrangler.jsonc` (name `cleanhashtags`, compatibility date set to today), Hono app, `GET /api/health` → `{ ok: true }`, Vitest with workers pool, `pnpm --filter api dev` runs `wrangler dev`.

**Step 7 — `feat(api): D1 schema and seed list`**
Migration `0001_hashtags.sql`: table `hashtags(tag TEXT PRIMARY KEY, status TEXT CHECK(...), source TEXT, notes TEXT, last_verified_at TEXT, updated_at TEXT)`. `seed/hashtags.json` with a small starter set marked `reported` (source `community-list-2020`, `last_verified_at` null) — include the calibration tags `alone`, `curvygirls`, `dm`, `kissing`, `petite`; a script `pnpm --filter api db:seed` that loads it into local D1. Document the data provenance in `seed/README.md`.

**Step 8 — `feat(api): POST /api/check`**
Validate body with shared schema (400 with `ApiError` on failure), normalize via `parseHashtags`, one batched D1 query, return a status per tag in input order (`unknown` when absent). Repository module isolated from the route so it is testable. Integration tests against D1 in the workers pool.

**Step 9 — `feat(api): caching, rate limiting, hardening`**
KV cache per tag (short TTL, e.g. 1h), Rate Limiting binding per client IP on `/api/check` (429 with `Retry-After`), CORS restricted to configured origins, request body size limit, global error handler that never leaks internals, security headers. Tests for 429 and cache hit paths.

## Milestone 3 — Web (React, learning-oriented)

**Step 10 — `feat(web): Vite + React scaffold`**
`apps/web` from Vite React-TS template, cleaned up; Vitest + React Testing Library + jsdom; Vite dev proxy `/api` → `http://localhost:8787`; root `pnpm dev` runs API and web together. Worker serves `apps/web/dist` via `assets` with SPA fallback. A minimal `App` with a heading and a smoke test.
Learning: `docs/learning/01-components-and-jsx.md` (components, JSX, props, how Vite boots React).

**Step 11 — `feat(web): hashtag input with live preview`**
`HashtagForm`: controlled `<textarea>`, live parsed-tag chips using `parseHashtags` from shared, counter `n/30`, invalid-tag hints, submit disabled when empty or over limit. Accessible labels. Tests with user-event.
Learning: `02-state-and-controlled-inputs.md` (useState, controlled inputs, derived state vs stored state).

**Step 12 — `feat(web): call the API and show loading/errors`**
Typed `api/client.ts` (fetch + Zod-parse the response), submit handler with loading, error (incl. 429 message) and success states. Tests mock fetch.
Learning: `03-events-async-and-effects.md` (event handlers, async state, why this does not need `useEffect`, when you would).

**Step 13 — `feat(web): results view with copy and reset`**
`ResultsList` with status badges (colour + text, not colour alone), source and "verified N days ago", summary counts, "Copy safe hashtags" (only `clear`/`unknown`, clipboard API with fallback), Reset. Lifting state up into `App`.
Learning: `04-lists-keys-and-lifting-state.md`.

**Step 14 — `refactor(web): extract useHashtagCheck hook and polish UI`**
Move request state into a custom hook, add simple CSS (CSS modules or a single stylesheet), responsive layout, dark mode via `prefers-color-scheme`, footer with data-freshness disclaimer.
Learning: `05-custom-hooks-and-styling.md`.

## Milestone 4 — Quality, extensibility, docs

**Step 15 — `ci: add GitHub Actions and Dependabot`**
Workflow on push/PR: pnpm install (cached), lint, typecheck, test, build. `.github/dependabot.yml` for npm (weekly, grouped) and github-actions.

**Step 16 — `feat(api): verifier interface with Graph API stub`**
`Verifier` interface (`verify(tags) → Promise<VerifiedResult[]>`), `NoopVerifier` (default) and a `GraphApiVerifier` skeleton documenting the `ig_hashtag_search` flow, 30-tags/7-days budget and required permissions — not wired to real calls, disabled unless `GRAPH_API_ENABLED` is set. Tests for the noop path.

**Step 17 — `docs: README, license and contributing`**
README: what it does, how verdicts work and their limits, local setup (`pnpm i`, `pnpm --filter api db:migrate:local`, seed, `pnpm dev`), deploy steps (`wrangler d1 create`, KV namespace, `wrangler deploy`), project layout, link to learning notes. MIT `LICENSE`. `CONTRIBUTING.md` incl. how to propose list changes with evidence.

## Final — Review

Run all checks and `pnpm build` from a clean install, review the branch against this plan, fix gaps in `fix:` commits, and report anything left for the owner (Cloudflare account setup, deploy, push/PR).

## Out of scope (later)

- Real Graph API integration and account connection (needs Meta app review).
- Browser extension for checking inside Instagram's caption box.
- Admin UI for curating the list; public API keys and paid tier.
