import { describe, expect, it } from "vitest";
import { MAX_TAGS } from "./hashtags";
import {
  ApiError,
  CheckRequest,
  CheckResponse,
  CheckResult,
  HashtagStatus,
} from "./schemas";

describe("CheckRequest", () => {
  it("accepts 1..MAX_TAGS hashtags", () => {
    expect(CheckRequest.safeParse({ hashtags: ["#travel"] }).success).toBe(
      true,
    );
    const max = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(CheckRequest.safeParse({ hashtags: max }).success).toBe(true);
  });

  it("trims each entry", () => {
    expect(CheckRequest.parse({ hashtags: ["  #a  "] })).toEqual({
      hashtags: ["#a"],
    });
  });

  it.each([
    ["empty array", { hashtags: [] }],
    [
      "too many tags",
      { hashtags: Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`) },
    ],
    ["blank entry", { hashtags: ["   "] }],
    ["oversized entry", { hashtags: ["a".repeat(201)] }],
    ["non-string entry", { hashtags: [42] }],
    ["missing field", {}],
    ["string instead of array", { hashtags: "#a #b" }],
    ["null body", null],
  ])("rejects %s", (_label, payload) => {
    expect(CheckRequest.safeParse(payload).success).toBe(false);
  });
});

describe("HashtagStatus", () => {
  it("lists every status", () => {
    expect(HashtagStatus.options).toEqual([
      "banned",
      "restricted",
      "reported",
      "clear",
      "unknown",
    ]);
  });

  it("rejects anything else", () => {
    expect(HashtagStatus.safeParse("safe").success).toBe(false);
  });
});

describe("CheckResult", () => {
  it("accepts a minimal result", () => {
    expect(
      CheckResult.safeParse({ hashtag: "dm", status: "unknown" }).success,
    ).toBe(true);
  });

  it("accepts source and date or datetime lastVerifiedAt", () => {
    for (const lastVerifiedAt of ["2026-10-10", "2026-10-10T12:00:00Z"]) {
      expect(
        CheckResult.safeParse({
          hashtag: "dm",
          status: "reported",
          source: "community-list-2020",
          lastVerifiedAt,
        }).success,
      ).toBe(true);
    }
  });

  it.each([
    ["bad status", { hashtag: "dm", status: "safe" }],
    ["empty hashtag", { hashtag: "", status: "clear" }],
    [
      "non-ISO date",
      { hashtag: "dm", status: "clear", lastVerifiedAt: "10/10/2026" },
    ],
    ["null source", { hashtag: "dm", status: "clear", source: null }],
  ])("rejects %s", (_label, payload) => {
    expect(CheckResult.safeParse(payload).success).toBe(false);
  });
});

describe("CheckResponse", () => {
  it("accepts a valid response", () => {
    const parsed = CheckResponse.safeParse({
      results: [{ hashtag: "dm", status: "reported" }],
      checkedAt: "2026-10-10T12:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing checkedAt or invalid result", () => {
    expect(CheckResponse.safeParse({ results: [] }).success).toBe(false);
    expect(
      CheckResponse.safeParse({
        results: [{ hashtag: "dm" }],
        checkedAt: "2026-10-10T12:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("ApiError", () => {
  it("accepts an error with and without issues", () => {
    expect(
      ApiError.safeParse({
        error: { code: "rate_limited", message: "Too many requests" },
      }).success,
    ).toBe(true);
    expect(
      ApiError.safeParse({
        error: {
          code: "bad_request",
          message: "Invalid body",
          issues: [{ path: "hashtags", message: "Too small" }],
        },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown codes", () => {
    expect(
      ApiError.safeParse({ error: { code: "teapot", message: "no" } }).success,
    ).toBe(false);
  });
});
