import { BusinessRuleError } from "@/core/domain/error";
import { ProjectConfigErrorCode } from "./errorCode";

export type AppName = string & { readonly brand: "AppName" };

export const AppName = {
  create: (name: string): AppName => {
    if (name.length === 0) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.EmptyAppName,
        "App name cannot be empty",
      );
    }
    return name as AppName;
  },
};
