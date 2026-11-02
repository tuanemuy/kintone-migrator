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

/**
 * The app revision of the published (deployed) generation, or the fact that
 * the app has never been deployed and so has no published generation yet.
 */
export type PublishedAppRevision =
  | Readonly<{ kind: "deployed"; revision: string }>
  | Readonly<{ kind: "neverDeployed" }>;

/** The app revisions of both generations of one app. */
export type AppRevisionGenerations = Readonly<{
  preview: string;
  published: PublishedAppRevision;
}>;

/**
 * Whether a deploy of the app would publish anything that is waiting in
 * preview.
 *
 * kintone keeps one revision per app: every settings change in preview
 * advances the preview revision, and a deploy (or reverting preview) makes the
 * published revision equal to it again. Equal revisions therefore mean preview
 * holds nothing undeployed. The converse is conservative: an edit that was
 * later undone by hand still leaves the revisions apart.
 *
 * - `upToDate`: preview and published are at the same revision.
 * - `pending`: preview is ahead of published — undeployed changes, or a deploy
 *   that has not finished yet.
 * - `neverDeployed`: the app has no published generation; a deploy would
 *   publish its entire configuration.
 */
export type DeployState =
  | Readonly<{ kind: "upToDate"; revision: string }>
  | Readonly<{
      kind: "pending";
      previewRevision: string;
      publishedRevision: string;
    }>
  | Readonly<{ kind: "neverDeployed"; previewRevision: string }>;
