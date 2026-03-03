import type { StorageResult } from "@/core/domain/ports/storageResult";

export type CaptureOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

type CaptureFromConfigParams<TRemote> = {
  readonly fetchRemote: () => Promise<TRemote>;
  readonly serialize: (remote: TRemote) => string;
  readonly getStorage: () => Promise<StorageResult>;
};

export async function captureFromConfig<TRemote>(
  config: CaptureFromConfigParams<TRemote>,
): Promise<CaptureOutput> {
  const remote = await config.fetchRemote();
  const configText = config.serialize(remote);
  const existing = await config.getStorage();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
