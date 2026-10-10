import { ApiError, CheckResponse } from "@cleanhashtags/shared";
import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

function check(body: unknown) {
  return exports.default.fetch("http://localhost/api/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function expectBadRequest(res: Response) {
  expect(res.status).toBe(400);
  const body = ApiError.parse(await res.json());
  expect(body.error.code).toBe("bad_request");
  return body;
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM hashtags"),
    env.DB.prepare(
      `INSERT INTO hashtags (tag, status, source, notes, last_verified_at) VALUES
        ('dm', 'reported', 'community-list-2020', NULL, NULL),
        ('banme', 'banned', 'graph-api', 'test row', '2026-10-01'),
        ('sunset', 'clear', 'manual-check', NULL, '2026-10-10T12:00:00Z')`,
    ),
  ]);
});

describe("POST /api/check", () => {
  it("returns a status per tag in input order", async () => {
    const res = await check({ hashtags: ["sunset", "nothere", "dm", "banme"] });

    expect(res.status).toBe(200);
    const body = CheckResponse.parse(await res.json());
    expect(body.results).toEqual([
      {
        hashtag: "sunset",
        status: "clear",
        source: "manual-check",
        lastVerifiedAt: "2026-10-10T12:00:00Z",
      },
      { hashtag: "nothere", status: "unknown" },
      { hashtag: "dm", status: "reported", source: "community-list-2020" },
      {
        hashtag: "banme",
        status: "banned",
        source: "graph-api",
        lastVerifiedAt: "2026-10-01",
      },
    ]);
    expect(Date.parse(body.checkedAt)).not.toBeNaN();
  });

  it("normalizes, splits and dedupes input", async () => {
    const res = await check({ hashtags: ["#DM", "##dm  #Sunset", "dm"] });

    const body = CheckResponse.parse(await res.json());
    expect(body.results.map((r) => [r.hashtag, r.status])).toEqual([
      ["dm", "reported"],
      ["sunset", "clear"],
    ]);
  });

  it("rejects invalid JSON", async () => {
    await expectBadRequest(await check("{not json"));
  });

  it.each([
    ["missing hashtags", {}],
    ["empty list", { hashtags: [] }],
    ["non-string entries", { hashtags: [1, 2] }],
    [
      "too many entries",
      { hashtags: Array.from({ length: 31 }, (_, i) => `t${i}`) },
    ],
  ])("rejects %s with issues", async (_, payload) => {
    const body = await expectBadRequest(await check(payload));

    expect(body.error.issues?.length).toBeGreaterThan(0);
  });

  it("rejects invalid hashtags and lists them", async () => {
    const body = await expectBadRequest(
      await check({ hashtags: ["ok", "no-dash", "12345"] }),
    );

    expect(body.error.issues?.map((i) => i.message)).toEqual([
      "Invalid hashtag: no-dash",
      "Invalid hashtag: 12345",
    ]);
  });

  it("re-checks the limit after splitting entries", async () => {
    const many = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ");

    await expectBadRequest(await check({ hashtags: [many] }));
  });

  it("rejects input with no tags after normalizing", async () => {
    await expectBadRequest(await check({ hashtags: ["#", "##"] }));
  });
});
