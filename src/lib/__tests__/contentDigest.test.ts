import { describe, expect, it } from "vitest";
import { computeContentDigest, isContentDigest } from "../contentDigest";

function bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

/** sha256 of the empty byte sequence. */
const EMPTY_SHA256 =
  "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("computeContentDigest", () => {
  it("returns the sha256: prefixed 64-hex-character digest of the bytes", () => {
    const digest = computeContentDigest(bytes("hello"));

    expect(digest).toBe(
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("returns the same digest for identical content", () => {
    expect(computeContentDigest(bytes("console.log(1)"))).toBe(
      computeContentDigest(bytes("console.log(1)")),
    );
  });

  it("returns a different digest when a single byte differs", () => {
    expect(computeContentDigest(bytes("console.log(1)"))).not.toBe(
      computeContentDigest(bytes("console.log(2)")),
    );
  });

  it("digests a zero-byte input instead of failing", () => {
    expect(computeContentDigest(bytes(""))).toBe(EMPTY_SHA256);
    expect(computeContentDigest(new Uint8Array(0))).toBe(EMPTY_SHA256);
  });

  it("accepts a Uint8Array and an ArrayBuffer interchangeably", () => {
    const encoded = new TextEncoder().encode("same");

    expect(computeContentDigest(encoded)).toBe(
      computeContentDigest(encoded.buffer as ArrayBuffer),
    );
  });
});

describe("isContentDigest", () => {
  const HEX64 = "a".repeat(64);

  it("accepts every value computeContentDigest produces", () => {
    expect(isContentDigest(computeContentDigest(bytes("x")))).toBe(true);
    expect(isContentDigest(computeContentDigest(bytes("")))).toBe(true);
    expect(isContentDigest(EMPTY_SHA256)).toBe(true);
  });

  it.each([
    ["a non-string", 123],
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["a bare prefix", "sha256:"],
    ["another algorithm", `md5:${HEX64}`],
    ["a missing prefix", HEX64],
    ["a truncated digest", `sha256:${"a".repeat(63)}`],
    ["an over-long digest", `sha256:${"a".repeat(65)}`],
    ["uppercase hex", `sha256:${"A".repeat(64)}`],
    ["a non-hex character", `sha256:${"z".repeat(64)}`],
    ["leading whitespace", ` sha256:${HEX64}`],
    ["a trailing newline", `sha256:${HEX64}\n`],
    ["a doubled prefix", `sha256:sha256:${HEX64}`],
  ])("rejects %s", (_label, value) => {
    expect(isContentDigest(value)).toBe(false);
  });
});
