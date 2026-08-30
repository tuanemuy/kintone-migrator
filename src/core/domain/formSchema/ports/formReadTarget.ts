/**
 * Which generation of the kintone form definition to read.
 *
 * kintone keeps two generations of every form definition:
 * - `"preview"`: the unpublished, in-progress definition (kintone `preview: true`).
 *   Mutations always target this generation.
 * - `"published"`: the deployed definition (kintone `preview: false`), i.e. what
 *   end users currently see.
 */
export type FormReadTarget = "preview" | "published";

/** The generation read when a caller does not specify a target. */
export const DEFAULT_FORM_READ_TARGET = "preview" satisfies FormReadTarget;
