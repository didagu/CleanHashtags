import type { CheckResponse } from "@hashdetector/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { checkResponse } from "../test/fetch";
import { ResultsList } from "./ResultsList";

const response = checkResponse([
  { hashtag: "travel", status: "unknown" },
  {
    hashtag: "alone",
    status: "reported",
    source: "community-list-2020",
  },
  {
    hashtag: "sunset",
    status: "clear",
    source: "manual",
    lastVerifiedAt: "2026-10-07",
  },
  {
    hashtag: "badtag",
    status: "banned",
    source: "manual",
    lastVerifiedAt: "2026-10-10",
  },
]);

function setup(data: CheckResponse = response) {
  const onReset = vi.fn();
  const user = userEvent.setup();
  render(<ResultsList response={data} onReset={onReset} />);
  return { user, onReset };
}

function row(hashtag: string) {
  const list = screen.getByRole("list", { name: "Results" });
  const item = within(list)
    .getAllByRole("listitem")
    .find((li) => li.textContent.startsWith(`#${hashtag}`));
  if (!item) throw new Error(`No row for #${hashtag}`);
  return item;
}

describe("ResultsList", () => {
  it("summarises the counts per status", () => {
    setup();

    expect(
      screen.getByText(
        "Checked 4 hashtags: 1 Banned, 1 Reported, 1 Clear, 1 Unknown.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the API order and labels each status in text", () => {
    setup();

    const items = within(
      screen.getByRole("list", { name: "Results" }),
    ).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("strong")?.textContent)).toEqual([
      "#travel",
      "#alone",
      "#sunset",
      "#badtag",
    ]);
    expect(row("badtag")).toHaveTextContent("Banned");
    expect(row("travel")).toHaveTextContent("Unknown");
  });

  it("shows source and freshness relative to the check time", () => {
    setup();

    expect(row("sunset")).toHaveTextContent("Source: manual.");
    expect(row("sunset")).toHaveTextContent("Verified 3 days ago.");
    expect(row("badtag")).toHaveTextContent("Verified today.");
    expect(row("alone")).toHaveTextContent("Not verified yet.");
    expect(row("travel")).not.toHaveTextContent(/verified/i);
  });

  it("copies only clear and unknown hashtags", async () => {
    const { user } = setup();

    await user.click(
      screen.getByRole("button", { name: "Copy safe hashtags (2)" }),
    );

    await expect(navigator.clipboard.readText()).resolves.toBe(
      "#travel #sunset",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Copied 2 hashtags.");
  });

  it("offers the text to copy by hand when copying fails", async () => {
    const { user } = setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );

    await user.click(screen.getByRole("button", { name: /copy safe/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Could not copy automatically.",
    );
    expect(screen.getByLabelText("Safe hashtags")).toHaveValue(
      "#travel #sunset",
    );
  });

  it("disables copy when nothing is safe", () => {
    setup(checkResponse([{ hashtag: "badtag", status: "banned" }]));

    expect(
      screen.getByRole("button", { name: "Copy safe hashtags (0)" }),
    ).toBeDisabled();
  });

  it("calls onReset", async () => {
    const { user, onReset } = setup();

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
