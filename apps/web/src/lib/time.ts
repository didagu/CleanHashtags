const DAY_MS = 24 * 60 * 60 * 1000;
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "today", "yesterday", "12 days ago", measured from `now`. */
export function daysAgo(iso: string, now: Date): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "at an unknown date";
  const days = Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
  return relative.format(-days, "day");
}
