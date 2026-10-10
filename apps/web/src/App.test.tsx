import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the main heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "HashDetector" }),
    ).toBeInTheDocument();
  });

  it("acknowledges a submitted list", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Hashtags"), "travel sunset");
    await user.click(screen.getByRole("button", { name: "Check hashtags" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Ready to check 2 hashtags.",
    );
  });
});
