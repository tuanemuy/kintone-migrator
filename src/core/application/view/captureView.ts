import { ViewConfigSerializer } from "@/core/domain/view/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { ViewServiceArgs } from "../container/view";

export type CaptureViewOutput = CaptureOutput;

export async function captureView({
  container,
}: ViewServiceArgs): Promise<CaptureViewOutput> {
  return captureFromConfig({
    fetchRemote: () => container.viewConfigurator.getViews(),
    serialize: ({ views }) => ViewConfigSerializer.serialize({ views }),
    getStorage: () => container.viewStorage.get(),
  });
}
