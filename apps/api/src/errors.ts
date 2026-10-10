import type { ApiError, ApiErrorCode } from "@hashdetector/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type Issues = NonNullable<ApiError["error"]["issues"]>;

export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  issues?: Issues,
) {
  const body: ApiError = { error: { code, message, issues } };
  return c.json(body, status);
}

interface ValidationError {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}

export function zodIssues(error: ValidationError): Issues {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
