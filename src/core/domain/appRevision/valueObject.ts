/**
 * The app (preview) revision of a kintone app, persisted locally as the base
 * revision for 3-way drift detection.
 *
 * revision is an app-scoped value (shared by every config domain of one app),
 * so it is stored once per app in `state/<appName>/revision.yaml` rather than
 * inside each domain's snapshot state. The base snapshot of each
 * domain (`<domain>State`) carries only its config, never the revision.
 */
export type AppRevision = Readonly<{
  /** The app (preview) revision observed when the snapshots were captured. */
  revision: string;
}>;
