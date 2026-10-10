import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "../app";
import { apiError } from "../errors";

// 30 tags of at most 100 chars plus JSON overhead fits well below this.
export const MAX_BODY_BYTES = 8 * 1024;

export function parseOrigins(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export const apiCors: MiddlewareHandler<AppEnv> = cors({
  origin: (origin, c) =>
    parseOrigins((c.env as Env).ALLOWED_ORIGINS).has(origin) ? origin : null,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  maxAge: 600,
});

export const apiSecureHeaders: MiddlewareHandler<AppEnv> = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
  crossOriginResourcePolicy: "same-origin",
});

export const noStore: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
};

export const jsonBodyLimit: MiddlewareHandler<AppEnv> = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) =>
    apiError(
      c,
      413,
      "payload_too_large",
      `Request body must be at most ${MAX_BODY_BYTES} bytes.`,
    ),
});
