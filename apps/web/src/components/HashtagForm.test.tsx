import { MAX_TAGS } from "@cleanhashtags/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { HashtagForm } from "./HashtagForm";

// HashtagForm is controlled by its parent, so tests give it a parent that
// holds the text, like App does.
function Harness(props: {
  onSubmit: (tags: string[]) => void;
  busy?: boolean;
}) {
  const [text, setText] = useState("");
  return <HashtagForm text={text} onTextChange={setText} {...props} />;
}

function setup() {
  const onSubmit = vi.fn<(tags: string[]) => void>();
  const user = userEvent.setup();
  render(<Harness onSubmit={onSubmit} />);
  return {
    onSubmit,
    user,
    textarea: screen.getByLabelText("Hashtags"),
    submit: screen.getByRole("button", { name: "Check hashtags" }),
  };
}

describe("HashtagForm", () => {
  it("starts empty with submit disabled", () => {
    const { textarea, submit } = setup();

    expect(textarea).toHaveValue("");
    expect(screen.getByText(`0/${MAX_TAGS} hashtags`)).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it("shows parsed, deduplicated tags as you type", async () => {
    const { user, textarea, submit } = setup();

    await user.type(textarea, "#Travel, sunset travel");

    const chips = within(
      screen.getByRole("list", { name: "Hashtags to check" }),
    );
    expect(chips.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "#travel",
      "#sunset",
    ]);
    expect(screen.getByText(`2/${MAX_TAGS} hashtags`)).toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it("lists invalid tags as hints without counting them", async () => {
    const { user, textarea } = setup();

    await user.type(textarea, "ok 1234 bad-tag");

    const invalid = within(
      screen.getByRole("list", { name: "Invalid hashtags" }),
    );
    expect(
      invalid.getAllByRole("listitem").map((li) => li.textContent),
    ).toEqual(["1234", "bad-tag"]);
    expect(screen.getByText(`1/${MAX_TAGS} hashtags`)).toBeInTheDocument();
  });

  it("keeps submit disabled when only invalid tags are entered", async () => {
    const { user, textarea, submit } = setup();

    await user.type(textarea, "123 !!!");

    expect(submit).toBeDisabled();
  });

  it("disables submit over the tag limit", async () => {
    const { user, textarea, submit } = setup();
    const tooMany = Array.from({ length: MAX_TAGS + 2 }, (_, i) => `tag${i}`);

    await user.click(textarea);
    await user.paste(tooMany.join(" "));

    expect(
      screen.getByText(
        `${MAX_TAGS + 2}/${MAX_TAGS} hashtags (remove 2 to check)`,
      ),
    ).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(submit).toBeDisabled();
  });

  it("submits the parsed tags", async () => {
    const { user, textarea, submit, onSubmit } = setup();

    await user.type(textarea, "#one{enter}#two #one");
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(["one", "two"]);
  });

  it("blocks submission while busy", async () => {
    const onSubmit = vi.fn<(tags: string[]) => void>();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} busy />);

    await user.type(screen.getByLabelText("Hashtags"), "travel{enter}");

    const button = screen.getByRole("button", { name: "Checking…" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the text it is given", () => {
    render(
      <HashtagForm
        text="#from #parent"
        onTextChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Hashtags")).toHaveValue("#from #parent");
    expect(screen.getByText(`2/${MAX_TAGS} hashtags`)).toBeInTheDocument();
  });
});
