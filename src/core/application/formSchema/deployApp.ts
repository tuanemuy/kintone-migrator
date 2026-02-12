import type { ServiceArgs } from "../types";

export async function deployApp({ container }: ServiceArgs): Promise<void> {
  await container.appDeployer.deploy();
}
