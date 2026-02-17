import type { SpaceApp } from "@/core/domain/space/entity";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";
import { ValidationError, ValidationErrorCode } from "../error";

export type FetchSpaceAppsInput = Readonly<{
  spaceReader: SpaceReader;
  spaceId: string;
}>;

export async function fetchSpaceApps(
  input: FetchSpaceAppsInput,
): Promise<readonly SpaceApp[]> {
  const apps = await input.spaceReader.getSpaceApps(input.spaceId);

  if (apps.length === 0) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `No apps found in space ID: ${input.spaceId}`,
    );
  }

  return apps;
}
