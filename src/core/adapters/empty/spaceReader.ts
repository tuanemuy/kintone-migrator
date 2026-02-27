import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";

export const emptySpaceReader: SpaceReader = {
  async getSpaceApps() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySpaceReader.getSpaceApps not implemented",
    );
  },
};
