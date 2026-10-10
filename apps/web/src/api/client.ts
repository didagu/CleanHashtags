import { ApiError, CheckResponse } from "@hashdetector/shared";

export type ApiErrorKind =
  "network" | "rate_limited" | "bad_request" | "server" | "invalid_response";

// One error type for everything that can go wrong, with a message that is
// safe to show to the user as-is.
export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.kind = kind;
    this.status = status;
  }
}

function rateLimitMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (Number.isInteger(seconds) && seconds > 0) {
    return `Too many checks in a short time. Try again in ${seconds} seconds.`;
  }
  return "Too many checks in a short time. Try again in a minute.";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function toError(response: Response): Promise<ApiRequestError> {
  if (response.status === 429) {
    return new ApiRequestError(
      "rate_limited",
      rateLimitMessage(response.headers.get("Retry-After")),
      429,
    );
  }

  // Use the server's message when the body has the documented error shape.
  const body = ApiError.safeParse(await readJson(response));
  if (response.status >= 400 && response.status < 500) {
    return new ApiRequestError(
      "bad_request",
      body.success
        ? body.data.error.message
        : "The request was rejected. Check your hashtags and try again.",
      response.status,
    );
  }
  return new ApiRequestError(
    "server",
    "Something went wrong on our side. Please try again later.",
    response.status,
  );
}

/**
 * POST /api/check. Resolves with a validated response or rejects with an
 * ApiRequestError (an AbortError is re-thrown unchanged).
 */
export async function checkHashtags(
  hashtags: string[],
  options: { signal?: AbortSignal } = {},
): Promise<CheckResponse> {
  let response: Response;
  try {
    response = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags }),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiRequestError(
      "network",
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) throw await toError(response);

  // Never trust the shape of a response just because the types say so:
  // parsing turns a surprise from the server into a clear error here.
  const parsed = CheckResponse.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new ApiRequestError(
      "invalid_response",
      "The server sent an unexpected response. Please try again later.",
      response.status,
    );
  }
  return parsed.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return "Something unexpected happened. Please try again.";
}
