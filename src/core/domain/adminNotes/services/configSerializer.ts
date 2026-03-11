import type { AdminNotesConfig } from "../entity";

export const AdminNotesConfigSerializer = {
  serialize: (config: AdminNotesConfig): Record<string, unknown> => {
    const serialized = {
      content: config.content,
      includeInTemplateAndDuplicates: config.includeInTemplateAndDuplicates,
    };

    return serialized;
  },
};
