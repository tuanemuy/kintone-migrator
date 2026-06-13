import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";

/**
 * Reads the current remote app (preview) revision via {@link AppRevisionReader}
 * (ADR-188-007). This is the single, domain-agnostic path the `--all` early-skip
 * (AC-13, ステップ 13) uses to compare the remote revision against the locally
 * stored base before doing per-domain snapshot comparisons.
 *
 * Wave 2 wires the reader into the view container and exercises this path so the
 * reader is proven end-to-end before the `--all` aggregation builds on it.
 */
export async function getCurrentRemoteRevision(container: {
  appRevisionReader: AppRevisionReader;
}): Promise<string> {
  return container.appRevisionReader.getCurrent();
}
