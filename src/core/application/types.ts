import type { Container } from "./container";

export type ServiceArgs<T = undefined> = T extends undefined
  ? { container: Container }
  : { container: Container; input: T };
