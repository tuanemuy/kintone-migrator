import type { StorageResult } from "@/core/domain/ports/storageResult";
import { ValidationError, ValidationErrorCode } from "./error";

type ApplyFromConfigParams<TParsed, TRemote> = {
  readonly getStorage: () => Promise<StorageResult>;
  readonly parseConfig: (content: string) => TParsed;
  readonly fetchRemote: () => Promise<TRemote>;
  readonly update: (parsed: TParsed, remote: TRemote) => Promise<void>;
  readonly notFoundMessage: string;
};

export async function applyFromConfig<TParsed, TRemote>(
  config: ApplyFromConfigParams<TParsed, TRemote>,
): Promise<void> {
  const result = await config.getStorage();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      config.notFoundMessage,
    );
  }
  const parsed = config.parseConfig(result.content);
  const remote = await config.fetchRemote();
  await config.update(parsed, remote);
}
