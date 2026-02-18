import type { SpaceApp } from "@/core/domain/space/entity";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";
import { ValidationError, ValidationErrorCode } from "../error";

export type FetchSpaceAppsContainer = Readonly<{
  spaceReader: SpaceReader;
}>;

export type FetchSpaceAppsInput = Readonly<{
  spaceId: string;
}>;

export async function fetchSpaceApps(args: {
  container: FetchSpaceAppsContainer;
  input: FetchSpaceAppsInput;
}): Promise<readonly SpaceApp[]> {
  const apps = await args.container.spaceReader.getSpaceApps(
    args.input.spaceId,
  );

  if (apps.length === 0) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      `No apps found in space ID: ${args.input.spaceId}`,
    );
  }

  return apps;
}
