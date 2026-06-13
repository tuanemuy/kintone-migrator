/**
 * Port for reading the current *remote* app (preview) revision in one place.
 *
 * kintone's SDK has no dedicated "app revision" endpoint (`getApp` does not
 * return a revision); the revision is only carried by the per-config getters.
 * This reader collapses revision fetching into a single, domain-agnostic path
 * so that the cross-domain pull/push logic does not have to depend on the
 * schema configurator (avoiding a reverse dependency).
 *
 * It is distinct from {@link AppRevisionStorage}, which persists the *local
 * base* revision. The adapter reads the same **preview revision** as schema
 * step1's `getRevision()` (via `getFormFields({ preview: true })`) so the
 * `--all` early-skip compares like-with-like against the stored base.
 */
export interface AppRevisionReader {
  /** Returns the current remote app (preview) revision. */
  getCurrent(): Promise<string>;
}
