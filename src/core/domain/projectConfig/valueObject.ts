import { BusinessRuleError } from "@/core/domain/error";
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
  for (let i = 0; i < name.length; i++) {
    const ch = name.charCodeAt(i);
    if (ch <= 0x1f) return true;
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
        ProjectConfigErrorCode.PcEmptyAppName,
        `App name "${name}" contains invalid characters (path separators or control characters are not allowed)`,
      );
    }
    if (name === "." || name === "..") {
      throw new BusinessRuleError(
        ProjectConfigErrorCode.PcEmptyAppName,
        `App name "${name}" is not allowed (reserved path component)`,
      );
    }
    return name as AppName;
  },
};
