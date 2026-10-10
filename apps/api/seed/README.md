# Seed data

`hashtags.json` is the starter list loaded into D1 by `pnpm --filter api db:seed`
(local by default; `node scripts/seed.ts --remote` targets the deployed database).
Seeding is an upsert, so it is safe to re-run.

## Fields

| Field              | Meaning                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `tag`              | Normalized tag: no `#`, lowercase, NFKC (same rules as `parseHashtags`).  |
| `status`           | `banned`, `restricted`, `reported` or `clear`. `unknown` is never stored. |
| `source`           | Where the claim comes from (see below).                                   |
| `notes`            | Free-text context or evidence.                                            |
| `last_verified_at` | ISO date of the last first-hand check, or `null` if never verified by us. |

## Provenance

All current entries have status `reported` and source `community-list-2020`:
tags that appeared on "banned hashtag" lists widely shared by social media blogs
around 2019–2020. **None has been verified by this project**, so
`last_verified_at` is `null` and the API reports them as community-reported, not
banned.

That caution is deliberate. On 2026-10-10 we checked Instagram's `/popular/<tag>/`
page for 28 tags, including `alone`, `curvygirls`, `dm`, `kissing` and `petite`.
About half of a 2020 "banned" list rendered normally, while ordinary tags such as
`#sunset` did not, so neither old lists nor that page are reliable ban signals.
See `docs/adr/0001-stack-and-data-source.md`.

Promote an entry to `banned`/`restricted`/`clear` only with first-hand evidence
(for example a Graph API `ig_hashtag_search` result), and set `source`, `notes`
and `last_verified_at` accordingly.
