import { BusinessRuleError } from "@/core/domain/error";
import { hasControlChars, sanitizeForDisplay } from "@/lib/charValidation";
import { ProjectConfigErrorCode } from "./errorCode";

export type AppName = string & { readonly brand: "AppName" };

const INVALID_APP_NAME_CHARS = new Set([
  "/",
  "\\",
  ":",
  "*",
  "?",
  '"',
  "<",
  ">",
  "|",
]);

function hasInvalidAppNameChars(name: string): boolean {
  if (hasControlChars(name)) return true;
  for (let i = 0; i < name.length; i++) {
    if (INVALID_APP_NAME_CHARS.has(name[i])) return true;
  }
  return false;
}

export const AppName = {
  create: (name: string): AppName => {
    if (name.length === 0) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.PcEmptyAppName,
        "App name cannot be empty",
      );
    }
    if (hasInvalidAppNameChars(name)) {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.PcInvalidAppName,
        `App name "${sanitizeForDisplay(name)}" contains invalid characters (path separators or control characters are not allowed)`,
      );
    }
    if (name === "." || name === "..") {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.PcInvalidAppName,
        `App name "${name}" is not allowed (reserved path component)`,
      );
    }
    return name as AppName;
  },
};
