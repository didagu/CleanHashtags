import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createHashtagRepository } from "../src/db/hashtags";

const repo = createHashtagRepository(env.DB);

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM hashtags"),
    env.DB.prepare(
      `INSERT INTO hashtags (tag, status, source, notes, last_verified_at) VALUES
        ('dm', 'reported', 'community-list-2020', 'n', NULL),
        ('café', 'clear', 'manual-check', NULL, '2026-10-10')`,
    ),
  ]);
});

describe("HashtagRepository.findMany", () => {
  it("returns only matching records, keyed by tag", async () => {
    const found = await repo.findMany(["dm", "missing", "café"]);

    expect([...found.keys()].sort()).toEqual(["café", "dm"]);
    expect(found.get("dm")).toEqual({
      tag: "dm",
      status: "reported",
      source: "community-list-2020",
      notes: "n",
      lastVerifiedAt: null,
    });
    expect(found.get("café")?.lastVerifiedAt).toBe("2026-10-10");
  });

  it("handles an empty list without querying", async () => {
    expect((await repo.findMany([])).size).toBe(0);
  });

  it("treats tags as data, not SQL", async () => {
    const found = await repo.findMany(["dm' OR '1'='1", '"]']);

    expect(found.size).toBe(0);
  });
});
