import { ActionConfigSerializer } from "@/core/domain/action/services/configSerializer";
import type { ActionServiceArgs } from "../container/action";

export type CaptureActionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureAction({
  container,
}: ActionServiceArgs): Promise<CaptureActionOutput> {
  const { actions } = await container.actionConfigurator.getActions();

  const configText = ActionConfigSerializer.serialize({ actions });
  const existing = await container.actionStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
