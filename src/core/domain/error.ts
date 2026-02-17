import { AnyError } from "@/lib/error";
import { ActionErrorCode } from "./action/errorCode";
import { AdminNotesErrorCode } from "./adminNotes/errorCode";
import { AppPermissionErrorCode } from "./appPermission/errorCode";
import { CustomizationErrorCode } from "./customization/errorCode";
import { FieldPermissionErrorCode } from "./fieldPermission/errorCode";
import { FormSchemaErrorCode } from "./formSchema/errorCode";
import { GeneralSettingsErrorCode } from "./generalSettings/errorCode";
import { NotificationErrorCode } from "./notification/errorCode";
import { PluginErrorCode } from "./plugin/errorCode";
import { ProcessManagementErrorCode } from "./processManagement/errorCode";
import { ProjectConfigErrorCode } from "./projectConfig/errorCode";
import { RecordPermissionErrorCode } from "./recordPermission/errorCode";
import { ReportErrorCode } from "./report/errorCode";
import { SeedDataErrorCode } from "./seedData/errorCode";
import { ViewErrorCode } from "./view/errorCode";

export const BusinessRuleErrorCode = {
  ...ActionErrorCode,
  ...AdminNotesErrorCode,
  ...AppPermissionErrorCode,
  ...CustomizationErrorCode,
  ...FieldPermissionErrorCode,
  ...FormSchemaErrorCode,
  ...GeneralSettingsErrorCode,
  ...NotificationErrorCode,
  ...PluginErrorCode,
  ...ProcessManagementErrorCode,
  ...ProjectConfigErrorCode,
  ...RecordPermissionErrorCode,
  ...ReportErrorCode,
  ...SeedDataErrorCode,
  ...ViewErrorCode,
};

export type BusinessRuleErrorCode =
  (typeof BusinessRuleErrorCode)[keyof typeof BusinessRuleErrorCode];

/**
 * Domain Layer - Business Rule Error
 *
 * Represents a violation of business rules in the domain layer.
 * This error is thrown when domain logic determines that an operation cannot proceed.
 */
export class BusinessRuleError extends AnyError {
  override readonly name = "BusinessRuleError";

  constructor(
    public readonly code: BusinessRuleErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export function isBusinessRuleError(
  error: unknown,
): error is BusinessRuleError {
  return error instanceof BusinessRuleError;
}
