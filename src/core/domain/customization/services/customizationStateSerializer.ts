import type { CustomizationState } from "../state";
import { CustomizationConfigSerializer } from "./configSerializer";
import { resourceKey } from "./customizationMerge";
import { resourceName } from "./diffDetector";

/**
 * Serializes a {@link CustomizationState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link CustomizationConfigSerializer}), with the recorded content digest
 * injected into each FILE entry via the serializer's decorate hook. URL
 * resources and FILE resources with no recorded digest are written unchanged,
 * so the state file stays round-trip compatible with the captured config. The
 * app revision is NOT written here; it is persisted separately via
 * `AppRevisionStorage`.
 */
export const CustomizationStateSerializer = {
  serialize: (state: CustomizationState): Record<string, unknown> =>
    CustomizationConfigSerializer.serialize(
      state.config,
      (platform, category, resource) => {
        if (resource.type !== "FILE") {
          return undefined;
        }
        const digest = state.fileDigests.get(
          resourceKey(platform, category, resourceName(resource)),
        );
        return digest === undefined ? undefined : { digest };
      },
    ),
};
