import type { CheckResponse } from "@hashdetector/shared";
import { vi } from "vitest";

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

export function checkResponse(
  results: CheckResponse["results"],
): CheckResponse {
  return { results, checkedAt: "2026-10-10T12:00:00.000Z" };
}

/** Replaces global fetch for the current test; restored by vi.unstubAllGlobals. */
export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
