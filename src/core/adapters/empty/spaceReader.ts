import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SpaceApp } from "@/core/domain/space/entity";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";

export class EmptySpaceReader implements SpaceReader {
  async getSpaceApps(_spaceId: string): Promise<readonly SpaceApp[]> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptySpaceReader.getSpaceApps not implemented",
    );
  }
}
