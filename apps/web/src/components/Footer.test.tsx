import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("explains how fresh and reliable verdicts are", () => {
    render(<Footer />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(/can be out of date/);
    expect(footer).toHaveTextContent(/not that it is guaranteed safe/);
  });
});
