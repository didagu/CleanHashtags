import { Hono } from "hono";
import { checkRoutes } from "./routes/check";

export type AppEnv = { Bindings: Env };

export function createApp() {
  const app = new Hono<AppEnv>().basePath("/api");

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/", checkRoutes);

  return app;
}
