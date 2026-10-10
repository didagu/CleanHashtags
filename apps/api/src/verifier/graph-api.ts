import type { Verifier, VerifiedResult } from "./verifier";

/**
 * Instagram Graph API limit: each Business/Creator account may query at most
 * 30 unique hashtags in a rolling 7-day window. Re-querying a tag already in
 * the window does not count again.
 */
export const GRAPH_API_HASHTAG_BUDGET = { uniqueTags: 30, windowDays: 7 };

export interface GraphApiConfig {
  /** Long-lived user access token of the person who connected their account. */
  accessToken: string;
  /** Instagram Business or Creator account id (not the Facebook Page id). */
  igUserId: string;
}

export class GraphApiNotImplementedError extends Error {
  constructor() {
    super(
      "GraphApiVerifier is a stub; live Graph API calls are not implemented.",
    );
    this.name = "GraphApiNotImplementedError";
  }
}

/**
 * Skeleton for live verification through the Instagram Graph API. It makes no
 * network calls yet.
 *
 * Intended flow, per tag:
 *   GET https://graph.facebook.com/<version>/ig_hashtag_search
 *       ?user_id=<igUserId>&q=<tag>&access_token=<accessToken>
 *   - `{ data: [{ id }] }`: Instagram exposes the tag, so it is `clear`.
 *   - A generic error for an otherwise valid tag: Instagram hides it, so it is
 *     `restricted`. The API does not say whether a tag is banned or only
 *     restricted, and the error is not documented as a ban signal, so these
 *     results should be reviewed before they overwrite curated entries.
 *   - Auth, permission and rate-limit errors are not verdicts: skip the tag.
 *
 * Constraints:
 *   - Budget: see GRAPH_API_HASHTAG_BUDGET. Track queried tags per account and
 *     stop before the budget is spent; prefer tags missing from the list.
 *   - Account: an Instagram Business or Creator account linked to a Facebook Page.
 *   - Permissions: `instagram_basic` and Page access (`pages_show_list`,
 *     `pages_read_engagement`), plus the "Instagram Public Content Access"
 *     feature, which needs Meta app review. Check Meta's current docs before
 *     building this; names and versions change.
 *   - The token is a secret (`wrangler secret put`), never a plain var.
 */
export class GraphApiVerifier implements Verifier {
  readonly name = "graph-api";

  constructor(readonly config: GraphApiConfig) {}

  verify(_tags: readonly string[]): Promise<VerifiedResult[]> {
    return Promise.reject(new GraphApiNotImplementedError());
  }
}
