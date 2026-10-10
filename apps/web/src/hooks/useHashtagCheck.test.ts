import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { checkResponse, jsonResponse, mockFetch } from "../test/fetch";
import { useHashtagCheck } from "./useHashtagCheck";

// Lets a test decide when each fetch call resolves.
function deferredFetch() {
  const fetchMock = mockFetch();
  const pending: ((response: Response) => void)[] = [];
  fetchMock.mockImplementation(
    (_input, init) =>
      new Promise<Response>((resolve, reject) => {
        pending.push(resolve);
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  );
  return { fetchMock, pending };
}

const travel = checkResponse([{ hashtag: "travel", status: "unknown" }]);
const sunset = checkResponse([{ hashtag: "sunset", status: "clear" }]);

describe("useHashtagCheck", () => {
  it("goes idle -> loading -> success", async () => {
    const { pending } = deferredFetch();
    const { result } = renderHook(() => useHashtagCheck());
    expect(result.current.state).toEqual({ status: "idle" });

    act(() => void result.current.check(["travel"]));
    expect(result.current.state).toEqual({ status: "loading", count: 1 });

    act(() => pending[0]?.(jsonResponse(travel)));
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "success",
        response: travel,
      }),
    );
  });

  it("reports errors as a message", async () => {
    mockFetch().mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useHashtagCheck());

    await act(() => result.current.check(["travel"]));

    expect(result.current.state).toMatchObject({ status: "error" });
  });

  it("aborts an older request when a newer one starts", async () => {
    const { fetchMock, pending } = deferredFetch();
    const { result } = renderHook(() => useHashtagCheck());

    act(() => void result.current.check(["travel"]));
    act(() => void result.current.check(["sunset"]));
    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(firstSignal?.aborted).toBe(true);

    act(() => pending[1]?.(jsonResponse(sunset)));
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "success",
        response: sunset,
      }),
    );
  });

  it("reset cancels the request and returns to idle", async () => {
    const { fetchMock, pending } = deferredFetch();
    const { result } = renderHook(() => useHashtagCheck());

    act(() => void result.current.check(["travel"]));
    act(() => result.current.reset());
    act(() => pending[0]?.(jsonResponse(travel)));

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    await Promise.resolve();
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("aborts the request on unmount", () => {
    const { fetchMock } = deferredFetch();
    const { result, unmount } = renderHook(() => useHashtagCheck());

    act(() => void result.current.check(["travel"]));
    unmount();

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("keeps check and reset stable between renders", () => {
    mockFetch();
    const { result, rerender } = renderHook(() => useHashtagCheck());
    const { check, reset } = result.current;

    rerender();

    expect(result.current.check).toBe(check);
    expect(result.current.reset).toBe(reset);
  });
});
