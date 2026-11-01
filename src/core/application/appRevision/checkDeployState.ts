import { DeployStateEvaluator } from "@/core/domain/appRevision/services/deployStateEvaluator";
import type { DeployState } from "@/core/domain/appRevision/valueObject";
import type { DeployStateServiceArgs } from "../container/deployState";

/** Tells whether the app's preview holds changes a deploy would publish. */
export async function checkDeployState({
  container,
}: DeployStateServiceArgs): Promise<DeployState> {
  const generations = await container.appRevisionGenerationsReader.read();
  return DeployStateEvaluator.evaluate(generations);
}
