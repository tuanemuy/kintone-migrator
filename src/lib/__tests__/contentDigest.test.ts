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
  it("accepts a sha256-prefixed non-empty string", () => {
    expect(isContentDigest(computeContentDigest(bytes("x")))).toBe(true);
  });

  it("rejects a non-string, an empty string, a bare prefix, and other algorithms", () => {
    expect(isContentDigest(123)).toBe(false);
    expect(isContentDigest("")).toBe(false);
    expect(isContentDigest("sha256:")).toBe(false);
    expect(isContentDigest("md5:abc")).toBe(false);
  });
});
