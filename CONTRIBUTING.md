# Contributing

Thanks for helping. There are two kinds of contribution: code changes and hashtag list changes. The second matters most, because the list is the product.

## Code changes

1. Set up the repo as described in the [README](README.md#local-setup).
2. Keep changes small and focused. Use [Conventional Commits](https://www.conventionalcommits.org) messages, for example `feat(api): …`, `fix(web): …`, `docs: …`.
3. Before opening a pull request, run:

   ```sh
   pnpm lint && pnpm typecheck && pnpm test
   ```

   CI runs the same checks plus `pnpm build`.

4. Add or update tests with your change. TypeScript is strict; avoid `any`.
5. In `apps/web`, code doubles as learning material, so short comments that explain the React idea behind a piece of code are welcome.

Hosting must stay free. Do not add paid Cloudflare products, KV-based caching or a custom domain (see `docs/PLAN.md`).

## Proposing hashtag list changes

The list lives in [`apps/api/seed/hashtags.json`](apps/api/seed/hashtags.json); its fields and provenance rules are in [`apps/api/seed/README.md`](apps/api/seed/README.md). Open a pull request that edits the JSON and include the evidence in the description.

What counts as evidence:

| Proposed status | Evidence we need                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `banned`        | A first-hand check from the last 30 days: a Graph API `ig_hashtag_search` error for the tag, or screenshots showing the tag page hidden while logged in. Include the date and method. |
| `restricted`    | A first-hand check showing the tag is limited (for example "recent posts" hidden or a sensitive-content notice), with date and method.                                                |
| `clear`         | A first-hand check showing the tag works normally, with date and method.                                                                                                              |
| `reported`      | A link to where the tag is reported as banned. No verification needed, but it stays `reported`.                                                                                       |

Rules:

- Use the normalized form of the tag: no `#`, lowercase, the same rules as `parseHashtags` in `packages/shared`.
- Set `source` to how the claim was made (for example `graph-api`, `manual-check`, or the name of a published list), put a short summary of the evidence in `notes`, and set `last_verified_at` to the ISO date of the check. Leave it `null` for `reported`.
- Do not use Instagram's `/popular/<tag>/` page as evidence. It was tested on 2026-10-10 and does not track bans (see the seed README).
- Keep the file sorted by `tag`.
- Do not include personal data, such as account names or private screenshots, in the pull request.

To remove a tag or mark a banned tag as `clear` again, follow the same process: show a recent first-hand check.
