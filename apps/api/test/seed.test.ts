import {
  HashtagStatus,
  isValidHashtag,
  normalizeHashtag,
} from "@hashdetector/shared";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { buildSeedStatements, type SeedEntry } from "../scripts/seed-sql.ts";
import seed from "../seed/hashtags.json";

const entries = seed as SeedEntry[];

async function loadSeed() {
  await env.DB.batch(
    buildSeedStatements(entries).map((sql) => env.DB.prepare(sql)),
  );
}

describe("seed/hashtags.json", () => {
  it("contains normalized, valid, unique tags with a stored status", () => {
    const tags = entries.map((e) => e.tag);

    expect(new Set(tags).size).toBe(tags.length);
    for (const e of entries) {
      expect(normalizeHashtag(e.tag)).toBe(e.tag);
      expect(isValidHashtag(e.tag)).toBe(true);
      expect(HashtagStatus.exclude(["unknown"]).parse(e.status)).toBe(e.status);
      expect(e.source).not.toBe("");
    }
  });

  it("includes the calibration tags", () => {
    const tags = entries.map((e) => e.tag);

    expect(tags).toEqual(
      expect.arrayContaining([
        "alone",
        "curvygirls",
        "dm",
        "kissing",
        "petite",
      ]),
    );
  });

  it("loads into D1 and can be re-applied", async () => {
    await loadSeed();
    await loadSeed();

    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM hashtags",
    ).first<{ n: number }>();
    expect(row?.n).toBe(entries.length);

    const dm = await env.DB.prepare("SELECT * FROM hashtags WHERE tag = ?")
      .bind("dm")
      .first();
    expect(dm).toMatchObject({
      tag: "dm",
      status: "reported",
      source: "community-list-2020",
      last_verified_at: null,
    });
  });
});

describe("hashtags table", () => {
  it("rejects statuses that are not stored", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO hashtags (tag, status, source) VALUES ('x', 'unknown', 'test')",
      ).run(),
    ).rejects.toThrow(/CHECK constraint/);
  });

  it("escapes quotes in seed values", async () => {
    const [sql] = buildSeedStatements([
      {
        tag: "quoted",
        status: "clear",
        source: "it's fine",
        notes: null,
        last_verified_at: "2026-10-10",
      },
    ]);
    await env.DB.prepare(sql ?? "").run();

    const row = await env.DB.prepare(
      "SELECT source FROM hashtags WHERE tag = 'quoted'",
    ).first<{ source: string }>();
    expect(row?.source).toBe("it's fine");
  });
});
