import type { DeviceType, ViewType } from "./valueObject";

export type ViewConfig = Readonly<{
  type: ViewType;
  index: number;
  name: string;
  builtinType?: string;
  fields?: readonly string[];
  date?: string;
  title?: string;
  html?: string;
  pager?: boolean;
  device?: DeviceType;
  filterCond?: string;
  sort?: string;
}>;

export type ViewsConfig = Readonly<{
  views: Readonly<Record<string, ViewConfig>>;
}>;
