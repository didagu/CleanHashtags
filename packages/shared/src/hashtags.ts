export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 100;

export interface ParsedHashtags {
  tags: string[];
  invalid: string[];
}

const SEPARATORS = /[\s,]+/u;
const VALID_TAG = /^[\p{L}\p{M}\p{Nd}_]+$/u;
const ALL_DIGITS = /^\p{Nd}+$/u;

export function normalizeHashtag(raw: string): string {
  return raw.replace(/^#+/u, "").normalize("NFKC").toLowerCase();
}

export function isValidHashtag(tag: string): boolean {
  return (
    [...tag].length <= MAX_TAG_LENGTH &&
    VALID_TAG.test(tag) &&
    !ALL_DIGITS.test(tag)
  );
}

export function parseHashtags(input: string): ParsedHashtags {
  const tags: string[] = [];
  const invalid: string[] = [];
  const seenTags = new Set<string>();
  const seenInvalid = new Set<string>();

  for (const token of input.split(SEPARATORS)) {
    const tag = normalizeHashtag(token);
    if (tag === "") continue;

    if (isValidHashtag(tag)) {
      if (!seenTags.has(tag)) {
        seenTags.add(tag);
        tags.push(tag);
      }
    } else if (!seenInvalid.has(token)) {
      seenInvalid.add(token);
      invalid.push(token);
    }
  }

  return { tags, invalid };
}
