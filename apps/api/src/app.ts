import { Hono } from "hono";

export type AppEnv = { Bindings: Env };

export function createApp() {
  const app = new Hono<AppEnv>().basePath("/api");

  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}
