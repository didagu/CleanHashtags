import type { HashtagStatus } from "@cleanhashtags/shared";
import { STATUS_INFO } from "../lib/status";

// The label is always written out, so the status never relies on colour alone.
// The colours come from `.badge-<status>` in styles.css.
export function StatusBadge({ status }: { status: HashtagStatus }) {
  const { label, description } = STATUS_INFO[status];
  return (
    <span className={`badge badge-${status}`} title={description}>
      {label}
    </span>
  );
}
