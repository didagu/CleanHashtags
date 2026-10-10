import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
}

function stubExecCommand(result: boolean) {
  const execCommand = vi.fn(() => result);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return execCommand;
}

describe("copyText", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "execCommand");
  });

  it("uses the Clipboard API when available", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);

    await expect(copyText("#a #b")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("#a #b");
  });

  it("falls back to execCommand when the Clipboard API fails", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    const execCommand = stubExecCommand(true);

    await expect(copyText("#a")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back when there is no Clipboard API", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    stubExecCommand(false);

    await expect(copyText("#a")).resolves.toBe(false);
  });
});
