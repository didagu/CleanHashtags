import { describe, expect, it } from "vitest";
import { checkResponse, jsonResponse, mockFetch } from "../test/fetch";
import { ApiRequestError, checkHashtags, errorMessage } from "./client";

const okBody = checkResponse([
  { hashtag: "travel", status: "unknown" },
  {
    hashtag: "alone",
    status: "reported",
    source: "community-list-2020",
  },
]);

async function rejection(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => {
      throw new Error("expected the promise to reject");
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiRequestError);
  return error as ApiRequestError;
}

describe("checkHashtags", () => {
  it("posts the hashtags as JSON and returns the parsed response", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse(okBody));

    await expect(checkHashtags(["travel", "alone"])).resolves.toEqual(okBody);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/check",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtags: ["travel", "alone"] }),
      }),
    );
  });

  it("reports rate limiting with the Retry-After delay", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse(
        { error: { code: "rate_limited", message: "Too many requests." } },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

    const error = await rejection(checkHashtags(["travel"]));
    expect(error.kind).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(error.message).toBe(
      "Too many checks in a short time. Try again in 60 seconds.",
    );
  });

  it("falls back to a generic delay without Retry-After", async () => {
    mockFetch().mockResolvedValue(new Response(null, { status: 429 }));

    const error = await rejection(checkHashtags(["travel"]));
    expect(error.message).toMatch(/try again in a minute/i);
  });

  it("uses the server message for a 400 ApiError", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "bad_request",
            message: "Some hashtags are not valid Instagram hashtags.",
          },
        },
        { status: 400 },
      ),
    );

    const error = await rejection(checkHashtags(["bad-tag"]));
    expect(error.kind).toBe("bad_request");
    expect(error.message).toBe(
      "Some hashtags are not valid Instagram hashtags.",
    );
  });

  it("hides server internals on a 500", async () => {
    mockFetch().mockResolvedValue(
      new Response("stack trace here", { status: 500 }),
    );

    const error = await rejection(checkHashtags(["travel"]));
    expect(error.kind).toBe("server");
    expect(error.message).not.toContain("stack trace");
  });

  it("reports network failures", async () => {
    mockFetch().mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await rejection(checkHashtags(["travel"]));
    expect(error.kind).toBe("network");
  });

  it("rejects a response that does not match the schema", async () => {
    mockFetch().mockResolvedValue(jsonResponse({ results: "nope" }));

    const error = await rejection(checkHashtags(["travel"]));
    expect(error.kind).toBe("invalid_response");
  });

  it("re-throws aborts unchanged", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    mockFetch().mockRejectedValue(abort);

    await expect(checkHashtags(["travel"])).rejects.toBe(abort);
  });
});

describe("errorMessage", () => {
  it("passes through ApiRequestError messages", () => {
    expect(errorMessage(new ApiRequestError("network", "Offline."))).toBe(
      "Offline.",
    );
  });

  it("hides unexpected error details", () => {
    expect(errorMessage(new Error("internal detail"))).not.toContain(
      "internal detail",
    );
  });
});
