import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app";
import { apiError } from "../errors";

// Must match `period` of the binding in wrangler.jsonc. The binding does not
// report when a window resets, so the full period is the safe Retry-After.
export const RATE_LIMIT_PERIOD_SECONDS = 60;

export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? "unknown";
}

export function rateLimit(
  getLimiter: (env: Env) => RateLimit,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const { success } = await getLimiter(c.env).limit({
      key: clientIp(c.req.raw.headers),
    });
    if (success) {
      await next();
      return;
    }
    c.header("Retry-After", String(RATE_LIMIT_PERIOD_SECONDS));
    return apiError(
      c,
      429,
      "rate_limited",
      "Too many requests. Try again in a minute.",
    );
  };
}
