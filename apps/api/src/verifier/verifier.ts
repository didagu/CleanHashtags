import type { HashtagStatus } from "@hashdetector/shared";

/** A live check can only tell "searchable" from "hidden"; it never yields `banned` vs `restricted` nuance. */
export type VerifiedStatus = Extract<HashtagStatus, "restricted" | "clear">;

export interface VerifiedResult {
  hashtag: string;
  status: VerifiedStatus;
  /** Identifies the verifier, e.g. `graph-api`. Stored as the list's `source`. */
  source: string;
  verifiedAt: string;
}

/**
 * Live verification of hashtags against an external signal. Results are meant
 * to feed back into the curated list. Implementations return results only for
 * tags they actually verified; tags left out stay as the list has them.
 */
export interface Verifier {
  readonly name: string;
  verify(tags: readonly string[]): Promise<VerifiedResult[]>;
}

export class NoopVerifier implements Verifier {
  readonly name = "noop";

  verify(_tags: readonly string[]): Promise<VerifiedResult[]> {
    return Promise.resolve([]);
  }
}
