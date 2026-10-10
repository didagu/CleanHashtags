import {
  CheckRequest,
  MAX_TAGS,
  parseHashtags,
  type CheckResponse,
  type CheckResult,
} from "@cleanhashtags/shared";
import { Hono } from "hono";
import type { AppEnv } from "../app";
import { createHashtagRepository, type HashtagRecord } from "../db/hashtags";
import { apiError, zodIssues } from "../errors";
import { jsonBodyLimit } from "../middleware/hardening";
import { rateLimit } from "../middleware/rate-limit";

function toResult(tag: string, record: HashtagRecord | undefined): CheckResult {
  if (!record) return { hashtag: tag, status: "unknown" };
  return {
    hashtag: tag,
    status: record.status,
    source: record.source,
    ...(record.lastVerifiedAt ? { lastVerifiedAt: record.lastVerifiedAt } : {}),
  };
}

export const checkRoutes = new Hono<AppEnv>().post(
  "/check",
  rateLimit((env) => env.CHECK_RATE_LIMITER),
  jsonBodyLimit,
  async (c) => {
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return apiError(
        c,
        400,
        "bad_request",
        "Request body must be valid JSON.",
      );
    }

    const parsed = CheckRequest.safeParse(json);
    if (!parsed.success) {
      return apiError(
        c,
        400,
        "bad_request",
        "Invalid request body.",
        zodIssues(parsed.error),
      );
    }

    // Elements may hold several tags ("#a #b"), so the limit is re-checked after parsing.
    const { tags, invalid } = parseHashtags(parsed.data.hashtags.join("\n"));
    if (invalid.length > 0) {
      return apiError(
        c,
        400,
        "bad_request",
        "Some hashtags are not valid Instagram hashtags.",
        invalid.map((tag) => ({
          path: "hashtags",
          message: `Invalid hashtag: ${tag}`,
        })),
      );
    }
    if (tags.length === 0 || tags.length > MAX_TAGS) {
      return apiError(
        c,
        400,
        "bad_request",
        `Provide between 1 and ${MAX_TAGS} hashtags.`,
      );
    }

    const records = await createHashtagRepository(c.env.DB).findMany(tags);
    const body: CheckResponse = {
      results: tags.map((tag) => toResult(tag, records.get(tag))),
      checkedAt: new Date().toISOString(),
    };
    return c.json(body);
  },
);
