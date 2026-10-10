import type { HashtagStatus } from "@hashdetector/shared";
import type { CSSProperties } from "react";
import { STATUS_INFO } from "../lib/status";

// Inline styles are plain objects. Fine for a few values; step 14 moves
// styling into a stylesheet.
const COLOURS: Record<HashtagStatus, CSSProperties> = {
  banned: { background: "#fde2e1", color: "#8a1c14" },
  restricted: { background: "#fdeccf", color: "#7a4500" },
  reported: { background: "#fff6c7", color: "#5c4a00" },
  clear: { background: "#dcf5e3", color: "#14532d" },
  unknown: { background: "#e8eaee", color: "#33373d" },
};

// The label is always written out, so the status never relies on colour alone.
export function StatusBadge({ status }: { status: HashtagStatus }) {
  const { label, description } = STATUS_INFO[status];
  return (
    <span
      title={description}
      style={{
        ...COLOURS[status],
        borderRadius: "999px",
        padding: "0.1em 0.6em",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
