import type { HashtagStatus } from "@hashdetector/shared";

type StatusInfo = {
  label: string;
  description: string;
  // Safe statuses are the ones "Copy safe hashtags" includes.
  safe: boolean;
};

export const STATUS_INFO: Record<HashtagStatus, StatusInfo> = {
  banned: {
    label: "Banned",
    description: "Instagram hides posts for this hashtag.",
    safe: false,
  },
  restricted: {
    label: "Restricted",
    description: "Instagram limits what is shown for this hashtag.",
    safe: false,
  },
  reported: {
    label: "Reported",
    description: "Reported as banned by the community, not verified.",
    safe: false,
  },
  clear: {
    label: "Clear",
    description: "Verified as not banned.",
    safe: true,
  },
  unknown: {
    label: "Unknown",
    description: "Not in our list. No known problems, but not verified.",
    safe: true,
  },
};

// Display order for summaries: most serious first.
export const STATUS_ORDER: readonly HashtagStatus[] = [
  "banned",
  "restricted",
  "reported",
  "clear",
  "unknown",
];
