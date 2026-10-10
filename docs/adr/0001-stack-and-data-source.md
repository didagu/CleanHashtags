# ADR 0001: Stack and data source

- Status: accepted
- Date: 2026-10-10

## Context

HashDetector (now CleanHashtags) was a 2018 PHP app. For each hashtag it fetched `instagram.com/explore/tags/<tag>` and treated `0 Posts` in the meta description as a ban. That signal no longer exists:

- Logged-out Instagram pages are now an empty JavaScript shell, and `explore/tags` redirects to the login page.
- We tested `/popular/<tag>/` as a replacement on 2026-10-10 against 28 tags. It does not track bans. Nine of ten real niche tags, and `#sunset`, return "Page isn't available", while half of a 2020 "banned" list renders normally.

Other public checkers (Ayrshare, PostEverywhere, RiteKit) use a static, curated list. The only official live signal is the Instagram Graph API `ig_hashtag_search` endpoint. It returns a generic error for sensitive tags and is capped at 30 unique hashtags per 7 days per Business or Creator account, so it cannot back a public, anonymous checker on its own.

The owner also wants to use the rebuild to learn React.

## Decision

**Data source.** A curated list stored in our own database. Every entry has a status (`banned`, `restricted`, `reported`, `clear`), a source and a `last_verified_at` date. A tag that is not in the list returns `unknown`, never `clear`. Live verification through the Graph API, using a user's own connected account, is a later addition; this plan builds only a stub `Verifier` interface for it.

**Stack.**

- TypeScript in strict mode everywhere, in a pnpm workspace (`apps/api`, `apps/web`, `packages/shared`).
- API: a Cloudflare Worker running Hono. D1 holds the list, KV caches results, and the Workers Rate Limiting binding protects `/api/check`.
- Frontend: React with Vite, served as static assets by the same Worker, so there is one deploy.
- Zod schemas in `packages/shared`, used by both the API and the web app.
- Vitest for tests: `@cloudflare/vitest-pool-workers` for the API, React Testing Library with jsdom for the web app.
- ESLint (flat config, typescript-eslint, react-hooks) and Prettier.

## Consequences

- Verdicts are only as good as the list. The UI has to show where each verdict came from and how old it is, and the project needs a documented way to propose list changes with evidence.
- `unknown` will be a common answer at first. That is preferable to a wrong "clear".
- No scraping means no breakage when Instagram changes its markup, and no risk of the Worker's IPs being blocked.
- Cloudflare's free tier covers the expected traffic. The cost is lock-in to Workers, D1 and KV; the API code stays thin over Hono so a move would mostly mean swapping the data layer.
- A single Worker serving both API and assets keeps local dev and deploy simple, and avoids CORS for the app's own frontend.
- The Graph API path needs a Meta app review and per-user account connection, so it stays out of scope until the core app ships.
