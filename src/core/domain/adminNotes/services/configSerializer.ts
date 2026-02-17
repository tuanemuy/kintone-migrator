import { stringify as stringifyYaml } from "yaml";
import type { AdminNotesConfig } from "../entity";

export const AdminNotesConfigSerializer = {
  serialize: (config: AdminNotesConfig): string => {
    const serialized = {
      content: config.content,
      includeInTemplateAndDuplicates: config.includeInTemplateAndDuplicates,
    };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
