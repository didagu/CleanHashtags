import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { apiError } from "./errors";
import { apiCors, apiSecureHeaders, noStore } from "./middleware/hardening";
import { checkRoutes } from "./routes/check";

export type AppEnv = { Bindings: Env };

export function createApp() {
  const app = new Hono<AppEnv>().basePath("/api");

  app.use(apiSecureHeaders, noStore, apiCors);

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/", checkRoutes);

  app.notFound((c) => apiError(c, 404, "not_found", "Not found."));

  app.onError((err, c) => {
    if (err instanceof HTTPException && err.status < 500) {
      return apiError(c, err.status, "bad_request", "Bad request.");
    }
    console.error("Unhandled error", err);
    return apiError(c, 500, "internal_error", "Something went wrong.");
  });

  return app;
}
