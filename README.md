# CleanHashtags

Banned & restricted hashtag checker for Instagram. (Formerly HashDetector.)

CleanHashtags tells you which of your Instagram hashtags are known to be banned or restricted, so you can drop them before you post. Paste up to 30 hashtags and get a verdict for each one, with where that verdict comes from and how old it is.

It runs on Cloudflare's free Workers plan: one Worker serves the React app and a small JSON API backed by a D1 database.

## How verdicts work

Instagram has no public "is this hashtag banned?" endpoint, and the page the original 2018 version scraped no longer shows the signal. CleanHashtags therefore looks tags up in a **curated list**, and every entry carries its evidence:

| Status       | Meaning                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `banned`     | Verified first-hand: Instagram hides the tag.                               |
| `restricted` | Verified first-hand: the tag works but Instagram limits it.                 |
| `reported`   | Listed by others (for example old "banned hashtag" lists) but not verified. |
| `clear`      | Verified first-hand as usable.                                              |
| `unknown`    | Not in the list. This is **not** a "clear"; it means we have no data on it. |

Each result shows its `source` and, when the tag was verified, how many days ago. "Copy safe hashtags" copies only `clear` and `unknown` tags.

Limits worth knowing:

- The list is small. Today every entry is `reported`, taken from 2019–2020 community lists, and none has been verified by this project.
- Instagram changes its rules without notice, so even a verified verdict goes stale.
- A live check through the Instagram Graph API (`ig_hashtag_search`) is possible but limited to 30 unique hashtags per account per 7 days and needs Meta app review. Only a stub exists (`apps/api/src/verifier`), and it is off by default.

The reasoning behind this approach, including the 2026 calibration that ruled out scraping, is in [docs/adr/0001-stack-and-data-source.md](docs/adr/0001-stack-and-data-source.md).

## Local setup

Requirements: Node 22.18 or newer (see `.nvmrc`; the seed script runs TypeScript directly with Node) and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up). No Cloudflare account is needed for local development.

```sh
pnpm i
pnpm --filter api db:migrate:local   # create the local D1 schema
pnpm --filter api db:seed            # load seed/hashtags.json (re-runs migrations; safe to repeat)
pnpm dev                             # API on :8787, web app on Vite's port (usually :5173)
```

Open the Vite URL; it proxies `/api` to the Worker. Other scripts, all from the repo root:

| Command          | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `pnpm lint`      | ESLint and Prettier check                          |
| `pnpm typecheck` | `tsc --noEmit` in every package                    |
| `pnpm test`      | Vitest in every package (API tests run in workerd) |
| `pnpm build`     | Builds the web app to `apps/web/dist`              |
| `pnpm format`    | Prettier write                                     |

## Deploy

Everything below fits Cloudflare's free plan on the `*.workers.dev` subdomain. Do not add a custom domain or paid products.

```sh
cd apps/api
pnpm exec wrangler login
pnpm exec wrangler d1 create cleanhashtags
```

Copy the printed `database_id` into the `d1_databases` entry in `apps/api/wrangler.jsonc`, then:

```sh
pnpm db:seed:remote   # applies remote migrations, then seeds
pnpm run deploy       # `run` is required: `pnpm deploy` is a built-in pnpm command
                      # builds apps/web and publishes to https://cleanhashtags.<your-subdomain>.workers.dev
```

`ALLOWED_ORIGINS` in `wrangler.jsonc` can stay empty because the app and API share an origin. Keep `GRAPH_API_ENABLED` at `"false"`.

## Project layout

```
apps/api          Cloudflare Worker (Hono): /api routes, D1 access, rate limiting, verifier stub
  migrations/     D1 schema
  seed/           starter hashtag list and its provenance
apps/web          React + Vite frontend, served by the Worker as static assets
packages/shared   hashtag parsing and Zod schemas used by both apps
docs/             PLAN.md, ADRs and React learning notes
```

## Learning React with this repo

The frontend was built step by step as a React learning project. Each step has a note explaining the concepts it introduced, where to find them in the code, and exercises to try:

1. [Components and JSX](docs/learning/01-components-and-jsx.md)
2. [State and controlled inputs](docs/learning/02-state-and-controlled-inputs.md)
3. [Events, async and effects](docs/learning/03-events-async-and-effects.md)
4. [Lists, keys and lifting state](docs/learning/04-lists-keys-and-lifting-state.md)
5. [Custom hooks and styling](docs/learning/05-custom-hooks-and-styling.md)

## Next steps

Planned improvements, roughly in priority order. Everything here must keep hosting at $0.

### CI/CD and deployments

- [ ] **Deploy on merge to `master`.** Add a deploy job using `cloudflare/wrangler-action` with a scoped `CLOUDFLARE_API_TOKEN` secret. The job applies remote D1 migrations, then deploys. Today deploys are run by hand from a laptop.
- [ ] **Know when new code is live.** Deploy through a GitHub `production` environment whose URL is `https://cleanhashtags.didagou.workers.dev`, so each deployment shows up on the repo and its PR with a "View deployment" link. Add `GET /api/version` returning the deployed git SHA and build time, and show it in the page footer.
- [ ] **Post-deploy smoke test.** After deploying, poll `/api/version` until it reports the new SHA, then check `/api/health` and a `/api/check` request. Fail the workflow, and so the deployment status, if they don't pass.
- [ ] **Preview deployments per PR.** Upload a Worker version with `wrangler versions upload` on every PR and comment its preview URL on the PR (free on Workers).
- [ ] **Make CI a required check.** Add the `check` job as a required status check in the `protect-default-branch` ruleset, so red PRs can't be merged now that approvals are no longer required.
- [ ] **Faster, clearer CI.** Split lint, typecheck, test and build into parallel jobs, and upload test coverage as a report.
- [ ] **End-to-end test.** Add a Playwright smoke test that loads the app, checks a few hashtags and copies the result. Run it in CI and against preview URLs.
- [ ] **Dependabot hygiene.** Auto-merge passing minor and patch updates. Keep `@types/node` in step with the runtime (`.nvmrc` is Node 22 while `@types/node` is 26), either by moving the runtime to the current Node LTS or by ignoring `@types/node` majors.
- [ ] **Releases and changelog.** Use release-please (or similar) to tag releases and keep a `CHANGELOG.md` from conventional commits.

### Security and operations

- [ ] Turn on secret scanning, push protection and Dependabot security updates, which are currently disabled, and add CodeQL scanning.
- [ ] Add `SECURITY.md` with a way to report vulnerabilities.
- [ ] Uptime check: a scheduled GitHub Actions job that hits `/api/health` and opens an issue if it fails.
- [ ] Watch for abuse in Workers Logs. If needed, add Cloudflare Turnstile (free) in front of `/api/check` and tune the rate limit (20 requests per minute per IP).

### Data quality

- [ ] **Verify the seed list.** All 24 seed tags are `reported` (unverified, from 2020-era lists). Check each one, record `last_verified_at`, and promote or drop it.
- [ ] **List curation workflow.** Accept list changes through a GitHub issue template that asks for evidence, plus a script that applies approved changes to D1.
- [ ] **Live verification.** Implement `GraphApiVerifier` against `ig_hashtag_search` (needs an Instagram Business/Creator account and Meta app review), with users connecting their own account. Every verified result should update the shared list.

### Product

- [ ] Suggest replacement hashtags for banned or restricted ones.
- [ ] SEO basics: Open Graph and Twitter meta tags, a share image, `robots.txt`, `sitemap.xml`.
- [ ] Privacy-friendly usage stats with Cloudflare Web Analytics (free, no cookies).
- [ ] Accessibility audit (keyboard, screen reader, contrast) and a Lighthouse check in CI.
- [ ] Browser extension that checks hashtags inside Instagram's caption box, using the same API.

### Repository

- [ ] Move to TypeScript 7 once `typescript-eslint` supports it (held at 6.0 today).
- [ ] Issue and PR templates, plus `CODEOWNERS`.
- [ ] Learning notes: replace line-number references with permalinks to the commit each note was written for, so they don't go stale.
- [ ] Optional, not free: a custom domain (`cleanhashtags.com` was unregistered as of October 2026).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), including how to propose changes to the hashtag list.

## License

[MIT](LICENSE)
