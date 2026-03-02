import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { AdminNotesConfig } from "../entity";

export const AdminNotesConfigSerializer = {
  serialize: (config: AdminNotesConfig): string => {
    const serialized = {
      content: config.content,
      includeInTemplateAndDuplicates: config.includeInTemplateAndDuplicates,
    };

    return serializeToYaml(serialized);
  },
};
