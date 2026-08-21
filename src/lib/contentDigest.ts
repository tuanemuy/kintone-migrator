import { createHash } from "node:crypto";

const PREFIX = "sha256:";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

/**
 * Content fingerprint of a byte sequence, formatted as `sha256:<64 hex chars>`.
 *
 * The algorithm prefix keeps stored digests distinguishable if the algorithm
 * ever changes, and makes the value self-describing in YAML.
 */
export type ContentDigest = `sha256:${string}`;

/**
 * Computes the digest of raw bytes.
 *
 * The bytes are hashed as-is: no newline / BOM / trailing-newline normalization.
 * kintone stores the uploaded byte sequence verbatim, so normalizing here would
 * report "no changes" for content that actually changes once uploaded. A
 * zero-byte input is a normal input and yields the sha256 of the empty string,
 * so "no digest recorded" stays distinguishable from "the content is empty".
 */
export function computeContentDigest(
  data: ArrayBuffer | Uint8Array,
): ContentDigest {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return `${PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;
}

/**
 * Narrows an untrusted value (e.g. a parsed state file) to a {@link ContentDigest}.
 *
 * The full `sha256:<64 lowercase hex chars>` shape is enforced, not just the
 * prefix: state files are hand-editable, and a truncated or otherwise malformed
 * digest would be adopted as a comparison token and silently report the remote
 * as changed. Every value {@link computeContentDigest} produces matches.
 */
export function isContentDigest(value: unknown): value is ContentDigest {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}
