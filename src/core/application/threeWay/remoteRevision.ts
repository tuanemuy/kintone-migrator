import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";

/**
 * Reads the current remote app (preview) revision via {@link AppRevisionReader}.
 * This is the single, domain-agnostic path the `--all` early-skip uses to
 * compare the remote revision against the locally stored base before doing
 * per-domain snapshot comparisons.
 */
export async function getCurrentRemoteRevision(container: {
  appRevisionReader: AppRevisionReader;
}): Promise<string> {
  return container.appRevisionReader.getCurrent();
}
