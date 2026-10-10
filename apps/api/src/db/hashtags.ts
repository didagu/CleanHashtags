import type { HashtagStatus } from "@hashdetector/shared";

export type StoredStatus = Exclude<HashtagStatus, "unknown">;

export interface HashtagRecord {
  tag: string;
  status: StoredStatus;
  source: string;
  notes: string | null;
  lastVerifiedAt: string | null;
}

interface HashtagRow {
  tag: string;
  status: StoredStatus;
  source: string;
  notes: string | null;
  last_verified_at: string | null;
}

export interface HashtagRepository {
  findMany(tags: readonly string[]): Promise<Map<string, HashtagRecord>>;
}

export function createHashtagRepository(db: D1Database): HashtagRepository {
  return {
    async findMany(tags) {
      if (tags.length === 0) return new Map();

      // json_each keeps this a single query with one bound parameter, whatever the tag count.
      const { results } = await db
        .prepare(
          `SELECT tag, status, source, notes, last_verified_at
           FROM hashtags
           WHERE tag IN (SELECT value FROM json_each(?))`,
        )
        .bind(JSON.stringify(tags))
        .all<HashtagRow>();

      return new Map(
        results.map((row) => [
          row.tag,
          {
            tag: row.tag,
            status: row.status,
            source: row.source,
            notes: row.notes,
            lastVerifiedAt: row.last_verified_at,
          },
        ]),
      );
    },
  };
}
