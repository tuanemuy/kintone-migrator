import { ActionConfigSerializer } from "@/core/domain/action/services/configSerializer";
import {
  type CaptureOutput,
  captureFromConfig,
} from "../captureFromConfigBase";
import type { ActionServiceArgs } from "../container/action";
import { stringifyToYaml } from "../stringifyToYaml";

export type CaptureActionOutput = CaptureOutput;

export async function captureAction({
  container,
}: ActionServiceArgs): Promise<CaptureActionOutput> {
  return captureFromConfig({
    fetchRemote: () => container.actionConfigurator.getActions(),
    serialize: ({ actions }) =>
      stringifyToYaml(ActionConfigSerializer.serialize({ actions })),
    getStorage: () => container.actionStorage.get(),
  });
}
