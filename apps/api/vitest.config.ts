import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Resolve from the file path rather than `new URL(...)`: the Workers runtime
// types also declare a global URL, which node:url's types do not accept.
const d1Migrations = await readD1Migrations(
  join(dirname(fileURLToPath(import.meta.url)), "migrations"),
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    provide: { d1Migrations },
    setupFiles: ["./test/setup.ts"],
  },
});
