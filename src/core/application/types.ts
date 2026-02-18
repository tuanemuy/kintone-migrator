export type ServiceArgs<C, T = undefined> = T extends undefined
  ? { container: C }
  : { container: C; input: T };
