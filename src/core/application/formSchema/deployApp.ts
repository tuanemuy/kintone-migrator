import type { Container } from "../container";
import type { ServiceArgs } from "../types";

export async function deployApp({
  container,
}: ServiceArgs<Container>): Promise<void> {
  await container.appDeployer.deploy();
}
