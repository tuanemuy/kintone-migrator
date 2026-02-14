import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export class EmptyAppDeployer implements AppDeployer {
  async deploy(): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppDeployer.deploy not implemented",
    );
  }
}
