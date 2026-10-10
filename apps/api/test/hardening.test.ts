import { ApiError } from "@cleanhashtags/shared";
import { env, exports } from "cloudflare:workers";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createApp, type AppEnv } from "../src/app";
import { MAX_BODY_BYTES, parseOrigins } from "../src/middleware/hardening";
import {
  RATE_LIMIT_PERIOD_SECONDS,
  rateLimit,
} from "../src/middleware/rate-limit";

function post(path: string, body: string, headers: Record<string, string>) {
  return exports.default.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function errorCode(res: Response) {
  return ApiError.parse(await res.json()).error.code;
}

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the binding rejects", async () => {
    const seen: string[] = [];
    let allowed = 1;
    const limiter: RateLimit = {
      limit: ({ key }) => {
        seen.push(key);
        return Promise.resolve({ success: allowed-- > 0 });
      },
    };
    const app = new Hono<AppEnv>().post(
      "/",
      rateLimit(() => limiter),
      (c) => c.text("ok"),
    );
    const req = () =>
      app.request(
        "/",
        { method: "POST", headers: { "cf-connecting-ip": "203.0.113.9" } },
        env,
      );

    expect((await req()).status).toBe(200);
    const res = await req();

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_PERIOD_SECONDS),
    );
    expect(await errorCode(res)).toBe("rate_limited");
    expect(seen).toEqual(["203.0.113.9", "203.0.113.9"]);
  });

  it("limits /api/check per client IP through the real binding", async () => {
    const ip = "198.51.100.23";
    const body = JSON.stringify({ hashtags: ["sunset"] });
    let res: Response | undefined;
    for (let i = 0; i < 50; i++) {
      res = await post("/api/check", body, { "cf-connecting-ip": ip });
      if (res.status === 429) break;
      expect(res.status).toBe(200);
    }

    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe(
      String(RATE_LIMIT_PERIOD_SECONDS),
    );
    const other = await post("/api/check", body, {
      "cf-connecting-ip": "198.51.100.24",
    });
    expect(other.status).toBe(200);
  });
});

describe("body size limit", () => {
  it("rejects bodies over the limit with 413", async () => {
    const huge = JSON.stringify({ hashtags: ["a".repeat(MAX_BODY_BYTES)] });

    const res = await post("/api/check", huge, {
      "cf-connecting-ip": crypto.randomUUID(),
    });

    expect(res.status).toBe(413);
    expect(await errorCode(res)).toBe("payload_too_large");
  });
});

describe("CORS", () => {
  const app = createApp();
  const corsEnv = {
    ...env,
    ALLOWED_ORIGINS: " https://ok.example ,http://localhost:5173",
  };
  const preflight = (origin: string) =>
    app.request(
      "/api/check",
      {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type",
        },
      },
      corsEnv,
    );

  it("parses a comma-separated origin list", () => {
    expect([...parseOrigins(" a , ,b")]).toEqual(["a", "b"]);
    expect(parseOrigins("").size).toBe(0);
  });

  it("allows configured origins", async () => {
    const res = await preflight("https://ok.example");

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://ok.example",
    );
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("does not allow other origins", async () => {
    const res = await preflight("https://evil.example");

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows no cross-origin callers by default", async () => {
    const res = await exports.default.fetch("http://localhost/api/health", {
      headers: { origin: "http://localhost:5173" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("security headers", () => {
  it("are set on API responses", async () => {
    const res = await exports.default.fetch("http://localhost/api/health");

    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("error handling", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await exports.default.fetch("http://localhost/api/nope");

    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("not_found");
  });

  it("hides internals of unexpected errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createApp();
    app.get("/boom", () => {
      throw new Error("secret connection string");
    });

    const res = await app.request("/api/boom", {}, env);

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret");
    expect(ApiError.parse(JSON.parse(text)).error.code).toBe("internal_error");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
