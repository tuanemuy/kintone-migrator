import { ViewConfigSerializer } from "@/core/domain/view/services/configSerializer";
import type { ViewServiceArgs } from "../container/view";

export type CaptureViewOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureView({
  container,
}: ViewServiceArgs): Promise<CaptureViewOutput> {
  const { views } = await container.viewConfigurator.getViews();

  const configText = ViewConfigSerializer.serialize({ views });
  const existing = await container.viewStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
