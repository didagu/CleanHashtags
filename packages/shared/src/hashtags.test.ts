import { describe, expect, it } from "vitest";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  isValidHashtag,
  normalizeHashtag,
  parseHashtags,
} from "./hashtags";

describe("parseHashtags", () => {
  it("returns nothing for empty or blank input", () => {
    expect(parseHashtags("")).toEqual({ tags: [], invalid: [] });
    expect(parseHashtags("   \n\t , ,")).toEqual({ tags: [], invalid: [] });
  });

  it("splits on whitespace, commas and newlines", () => {
    expect(parseHashtags("a  b,c\nd\r\ne\tf, ,g").tags).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
    ]);
  });

  it("splits on fullwidth and ideographic commas", () => {
    expect(parseHashtags("＃東京，＃大阪、京都")).toEqual({
      tags: ["東京", "大阪", "京都"],
      invalid: [],
    });
  });

  it("strips one or more leading #", () => {
    expect(parseHashtags("#travel ##food ###sun").tags).toEqual([
      "travel",
      "food",
      "sun",
    ]);
  });

  it("ignores lone # tokens", () => {
    expect(parseHashtags("# ## #ok")).toEqual({ tags: ["ok"], invalid: [] });
  });

  it("lowercases and dedupes preserving first-seen order", () => {
    expect(parseHashtags("#Sunset #beach #SUNSET sunset #Beach").tags).toEqual([
      "sunset",
      "beach",
    ]);
  });

  it("applies NFKC normalization before deduping", () => {
    const fullWidth = "ＴＡＧ";
    const decomposed = "café";
    expect(parseHashtags(`${fullWidth} tag ${decomposed} café`).tags).toEqual([
      "tag",
      "café",
    ]);
  });

  it("accepts unicode letters, digits and underscores", () => {
    expect(
      parseHashtags("#über #東京 #москва #नमस्ते #photo_of_the_day #2024vibes")
        .tags,
    ).toEqual([
      "über",
      "東京",
      "москва",
      "नमस्ते",
      "photo_of_the_day",
      "2024vibes",
    ]);
  });

  it("rejects emoji and punctuation, keeping the original token", () => {
    expect(parseHashtags("#love❤️ #🔥 #rock&roll #hello-world #ok")).toEqual({
      tags: ["ok"],
      invalid: ["#love❤️", "#🔥", "#rock&roll", "#hello-world"],
    });
  });

  it("rejects tags made only of digits", () => {
    expect(parseHashtags("#2024 #123abc")).toEqual({
      tags: ["123abc"],
      invalid: ["#2024"],
    });
  });

  it("rejects # inside a tag", () => {
    expect(parseHashtags("#one#two").invalid).toEqual(["#one#two"]);
  });

  it("enforces the maximum tag length", () => {
    const ok = "a".repeat(MAX_TAG_LENGTH);
    const tooLong = "a".repeat(MAX_TAG_LENGTH + 1);
    expect(parseHashtags(`${ok} ${tooLong}`)).toEqual({
      tags: [ok],
      invalid: [tooLong],
    });
  });

  it("counts length in code points, not UTF-16 units", () => {
    const astral = "\u{20000}".repeat(MAX_TAG_LENGTH);
    expect(parseHashtags(astral).tags).toEqual([astral]);
  });

  it("dedupes invalid tokens", () => {
    expect(parseHashtags("#a-b #a-b").invalid).toEqual(["#a-b"]);
  });

  it("does not cap the number of tags itself", () => {
    const input = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `t${i}`).join(
      " ",
    );
    expect(parseHashtags(input).tags).toHaveLength(MAX_TAGS + 5);
  });
});

describe("normalizeHashtag", () => {
  it("strips leading # and lowercases", () => {
    expect(normalizeHashtag("##InstaGood")).toBe("instagood");
  });

  it("strips a fullwidth ＃ typed with CJK keyboards", () => {
    expect(normalizeHashtag("＃Ａlone")).toBe("alone");
  });
});

describe("isValidHashtag", () => {
  it.each(["a", "a_b", "_", "x1", "ñandú"])("accepts %s", (tag) => {
    expect(isValidHashtag(tag)).toBe(true);
  });

  it.each(["", "1", "a b", "a.b", "a#b", "😀"])("rejects %j", (tag) => {
    expect(isValidHashtag(tag)).toBe(false);
  });
});

it("exposes MAX_TAGS = 30", () => {
  expect(MAX_TAGS).toBe(30);
});
