import type { CustomizationPlatform, CustomizationScope } from "./valueObject";

export type CustomizationConfig = Readonly<{
  scope: CustomizationScope | undefined;
  desktop: CustomizationPlatform;
  mobile: CustomizationPlatform;
}>;
