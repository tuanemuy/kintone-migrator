import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { ViewConfig, ViewsConfig } from "../entity";

function serializeViewConfig(config: ViewConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: config.type,
    index: config.index,
  };

  if (config.builtinType !== undefined) result.builtinType = config.builtinType;
  if (config.fields !== undefined) result.fields = [...config.fields];
  if (config.date !== undefined) result.date = config.date;
  if (config.title !== undefined) result.title = config.title;
  if (config.html !== undefined) result.html = config.html;
  if (config.pager !== undefined) result.pager = config.pager;
  if (config.device !== undefined) result.device = config.device;
  if (config.filterCond !== undefined) result.filterCond = config.filterCond;
  if (config.sort !== undefined) result.sort = config.sort;

  return result;
}

export const ViewConfigSerializer = {
  serialize: (config: ViewsConfig): string => {
    const serialized: Record<string, Record<string, unknown>> = {};

    for (const [name, viewConfig] of Object.entries(config.views)) {
      serialized[name] = serializeViewConfig(viewConfig);
    }

    return serializeToYaml({ views: serialized });
  },
};
