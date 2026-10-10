import { describe, expect, it } from "vitest";
import { daysAgo } from "./time";

const now = new Date("2026-10-10T12:00:00.000Z");

describe("daysAgo", () => {
  it.each([
    ["2026-10-10T08:00:00.000Z", "today"],
    ["2026-10-09T08:00:00.000Z", "yesterday"],
    ["2026-09-30", "10 days ago"],
    ["2026-10-11T00:00:00.000Z", "today"],
    ["not a date", "at an unknown date"],
  ])("%s -> %s", (iso, expected) => {
    expect(daysAgo(iso, now)).toBe(expected);
  });
});
