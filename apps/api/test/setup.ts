import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { inject } from "vitest";

await applyD1Migrations(env.DB, inject("d1Migrations"));
