export type KintoneRecordForResponse = Readonly<
  Record<string, { value: unknown }>
> & {
  readonly $id: { value: string };
};

export type KintoneRecordForParameter = Readonly<
  Record<string, { value: unknown }>
>;

export interface RecordManager {
  getAllRecords(
    condition?: string,
  ): Promise<readonly KintoneRecordForResponse[]>;
  addRecords(records: readonly KintoneRecordForParameter[]): Promise<void>;
  updateRecords(
    records: readonly { id: string; record: KintoneRecordForParameter }[],
  ): Promise<void>;
}
