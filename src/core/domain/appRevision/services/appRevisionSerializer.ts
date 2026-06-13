import type { AppRevision } from "../valueObject";

/**
 * Serializes an {@link AppRevision} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The domain layer does not depend on YAML; it returns a plain record and the
 * application layer handles codec encoding.
 */
export const AppRevisionSerializer = {
  serialize: (appRevision: AppRevision): Record<string, unknown> => ({
    revision: appRevision.revision,
  }),
};
