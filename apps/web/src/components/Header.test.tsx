import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the tagline when given", () => {
    render(<Header title="Title" tagline="A tagline" />);

    expect(screen.getByText("A tagline")).toBeInTheDocument();
  });

  it("omits the tagline when not given", () => {
    const { container } = render(<Header title="Title" />);

    expect(container.querySelector("p")).toBeNull();
  });
});
