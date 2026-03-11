import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "@/core/domain/services/yamlConfigParser";
import type { AdminNotesConfig } from "../entity";
import { AdminNotesErrorCode } from "../errorCode";

export const AdminNotesConfigParser = {
  parse: (parsed: unknown): AdminNotesConfig => {
    const obj = validateParsedConfig(
      parsed,
      AdminNotesErrorCode.AnInvalidConfigStructure,
      "Admin notes",
    );

    if (typeof obj.content !== "string") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have a "content" string property',
      );
    }

    if (typeof obj.includeInTemplateAndDuplicates !== "boolean") {
      throw new BusinessRuleError(
        AdminNotesErrorCode.AnInvalidConfigStructure,
        'Config must have an "includeInTemplateAndDuplicates" boolean property',
      );
    }

    return {
      content: obj.content,
      includeInTemplateAndDuplicates: obj.includeInTemplateAndDuplicates,
    };
  },
};
