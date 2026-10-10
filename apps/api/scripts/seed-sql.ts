export interface SeedEntry {
  tag: string;
  status: "banned" | "restricted" | "reported" | "clear";
  source: string;
  notes: string | null;
  last_verified_at: string | null;
}

function sqlValue(value: string | null): string {
  return value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
}

/** One idempotent upsert per entry, so re-seeding refreshes rows instead of failing. */
export function buildSeedStatements(entries: readonly SeedEntry[]): string[] {
  return entries.map(
    (e) =>
      "INSERT INTO hashtags (tag, status, source, notes, last_verified_at) VALUES (" +
      [e.tag, e.status, e.source, e.notes, e.last_verified_at]
        .map(sqlValue)
        .join(", ") +
      ") ON CONFLICT (tag) DO UPDATE SET status = excluded.status, source = excluded.source," +
      " notes = excluded.notes, last_verified_at = excluded.last_verified_at," +
      " updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');",
  );
}
