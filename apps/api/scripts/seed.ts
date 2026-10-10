import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeedStatements, type SeedEntry } from "./seed-sql.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv.includes("--remote") ? "--remote" : "--local";

const entries = JSON.parse(
  readFileSync(join(root, "seed/hashtags.json"), "utf8"),
) as SeedEntry[];

const sqlPath = join(root, ".wrangler/tmp/seed.sql");
mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, buildSeedStatements(entries).join("\n") + "\n");

execFileSync(
  "wrangler",
  ["d1", "execute", "hashdetector", target, "--yes", "--file", sqlPath],
  { cwd: root, stdio: "inherit" },
);
console.log(`Seeded ${entries.length} hashtags (${target.slice(2)}).`);
