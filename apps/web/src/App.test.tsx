import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { checkResponse, jsonResponse, mockFetch } from "./test/fetch";

async function submit(text: string) {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText("Hashtags"), text);
  await user.click(screen.getByRole("button", { name: "Check hashtags" }));
}

describe("App", () => {
  it("renders the main heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "CleanHashtags" }),
    ).toBeInTheDocument();
  });

  it("shows a loading state, then the results", async () => {
    let respond: (response: Response) => void = () => {};
    mockFetch().mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );

    await submit("travel alone");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking 2 hashtags…",
    );
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();

    respond(
      jsonResponse(
        checkResponse([
          { hashtag: "travel", status: "unknown" },
          { hashtag: "alone", status: "reported" },
        ]),
      ),
    );

    const results = await screen.findByRole("list", { name: "Results" });
    expect(results).toHaveTextContent("#travel: unknown");
    expect(results).toHaveTextContent("#alone: reported");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check hashtags" }),
    ).toBeEnabled();
  });

  it("shows the rate-limit message on 429", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse(
        { error: { code: "rate_limited", message: "Too many requests." } },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );

    await submit("travel");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many checks in a short time. Try again in 60 seconds.",
    );
  });

  it("shows an error when the server cannot be reached", async () => {
    mockFetch().mockRejectedValue(new TypeError("Failed to fetch"));

    await submit("travel");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server.",
    );
  });
});
