import type { DiffResult } from "@/core/domain/diff";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import { ValidationError, ValidationErrorCode } from "./error";

type DetectDiffConfig<
  TLocal,
  TRemote,
  TEntry extends { type: "added" | "modified" | "deleted" },
> = {
  readonly getStorage: () => Promise<StorageResult>;
  readonly fetchRemote: () => Promise<TRemote>;
  readonly parseConfig: (content: string) => TLocal;
  readonly detect: (local: TLocal, remote: TRemote) => DiffResult<TEntry>;
  readonly notFoundMessage: string;
};

export async function detectDiffFromConfig<
  TLocal,
  TRemote,
  TEntry extends { type: "added" | "modified" | "deleted" },
>(
  config: DetectDiffConfig<TLocal, TRemote, TEntry>,
): Promise<DiffResult<TEntry>> {
  const [storageResult, remote] = await Promise.all([
    config.getStorage(),
    config.fetchRemote(),
  ]);
  if (!storageResult.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      config.notFoundMessage,
    );
  }
  const local = config.parseConfig(storageResult.content);
  return config.detect(local, remote);
}
