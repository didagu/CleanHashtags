/** Copies text, returning false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  // The async Clipboard API needs a secure context (https or localhost).
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or not focused: try the legacy path below.
    }
  }
  return legacyCopy(text);
}

// Older browsers and plain-http pages: select a hidden textarea and use the
// deprecated execCommand, which is still widely supported.
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  try {
    return typeof document.execCommand === "function"
      ? document.execCommand("copy")
      : false;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
