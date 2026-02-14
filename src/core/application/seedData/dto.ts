export type UpsertSeedOutput = {
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly deleted: number;
  readonly total: number;
};

export type CaptureSeedOutput = {
  readonly seedText: string;
  readonly recordCount: number;
  readonly hasExistingSeed: boolean;
};
