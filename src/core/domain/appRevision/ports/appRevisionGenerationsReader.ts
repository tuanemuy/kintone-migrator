import type { AppRevisionGenerations } from "../valueObject";

/**
 * Port for reading the app revision of both the preview and the published
 * generation, to tell whether preview holds undeployed changes.
 *
 * It is separate from {@link AppRevisionReader}, which reads the preview
 * revision only: that value is the base revision for 3-way drift detection and
 * mutation guards, where a published revision has no meaning.
 *
 * An app that has never been deployed is reported as
 * `published.kind === "neverDeployed"`; an app that cannot be read at all is an
 * error, never `neverDeployed`.
 */
export interface AppRevisionGenerationsReader {
  read(): Promise<AppRevisionGenerations>;
}
