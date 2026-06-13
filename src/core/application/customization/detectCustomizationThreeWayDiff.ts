import { computeCustomizationThreeWayMerge } from "@/core/domain/customization/services/customizationMerge";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayServiceArgs } from "../container/customization";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { computeModifiedFileNames } from "./customizationRemote";
import { detectCustomizationDiff } from "./detectCustomizationDiff";
import { loadCustomizationThreeWayInputs } from "./loadCustomizationThreeWayInputs";

export type DetectCustomizationThreeWayDiffOutput =
  ThreeWayDiffResult<CustomizationDiff>;

export type DetectCustomizationThreeWayDiffInput = {
  readonly basePath: string;
};

/**
 * Detects customization differences with 3-way awareness (AC-9).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the file-name-keyed merge. Same-name files
 * whose content diverges are conflicts. When no state exists, falls back to the
 * existing 2-way `detectCustomizationDiff` (the CLI renders it with its 2-way
 * printer).
 */
export async function detectCustomizationThreeWayDiff({
  container,
  input,
}: CustomizationThreeWayServiceArgs<DetectCustomizationThreeWayDiffInput>): Promise<DetectCustomizationThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadCustomizationThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectCustomizationDiff({
      container,
      input: { basePath: input.basePath },
    });
    return { mode: "two-way", diff };
  }

  const modifiedFileNames = await computeModifiedFileNames(
    local,
    remote.raw,
    input.basePath,
    container,
  );

  const merge = computeCustomizationThreeWayMerge(
    state,
    local,
    remote.config,
    modifiedFileNames,
  );

  // The merge key (`platform:category:name` / `config:scope`) is also the label.
  return buildRecordThreeWayDiff(merge, (entry) => entry.key);
}
