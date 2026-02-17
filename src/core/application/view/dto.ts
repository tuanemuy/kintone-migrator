export type ViewDiffEntry = {
  readonly type: "added" | "modified" | "deleted";
  readonly viewName: string;
  readonly details: string;
};

export type DetectViewDiffOutput = {
  readonly entries: readonly ViewDiffEntry[];
  readonly summary: {
    readonly added: number;
    readonly modified: number;
    readonly deleted: number;
    readonly total: number;
  };
  readonly isEmpty: boolean;
};
