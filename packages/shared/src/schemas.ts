import { z } from "zod";
import { MAX_TAGS } from "./hashtags";

/** Raw input is normalized server-side, so allow some slack over MAX_TAG_LENGTH for `#` prefixes. */
const MAX_RAW_HASHTAG_LENGTH = 200;

export const CheckRequest = z.object({
  hashtags: z
    .array(z.string().trim().min(1).max(MAX_RAW_HASHTAG_LENGTH))
    .min(1)
    .max(MAX_TAGS),
});
export type CheckRequest = z.infer<typeof CheckRequest>;

export const HashtagStatus = z.enum([
  "banned",
  "restricted",
  "reported",
  "clear",
  "unknown",
]);
export type HashtagStatus = z.infer<typeof HashtagStatus>;

const IsoTimestamp = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const CheckResult = z.object({
  hashtag: z.string().min(1),
  status: HashtagStatus,
  source: z.string().min(1).optional(),
  lastVerifiedAt: IsoTimestamp.optional(),
});
export type CheckResult = z.infer<typeof CheckResult>;

export const CheckResponse = z.object({
  results: z.array(CheckResult),
  checkedAt: z.iso.datetime({ offset: true }),
});
export type CheckResponse = z.infer<typeof CheckResponse>;

export const ApiErrorCode = z.enum([
  "bad_request",
  "not_found",
  "payload_too_large",
  "rate_limited",
  "internal_error",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    issues: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
