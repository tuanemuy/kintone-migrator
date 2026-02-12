import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export class EmptyAppDeployer implements AppDeployer {
  async deploy(): Promise<void> {
    throw new Error("EmptyAppDeployer.deploy not implemented");
  }
}
