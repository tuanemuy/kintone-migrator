import type { SeedCliContainerConfig } from "@/core/application/container/cli";
import { createDomainConfigResolver } from "../../createDomainConfigResolver";
import type { MultiAppCliValues } from "../../projectConfig";

export type SeedCliValues = MultiAppCliValues & {
  clean?: boolean;
  yes?: boolean;
  "key-field"?: string;
  "seed-file"?: string;
};

const {
  resolveFilePath: resolveSeedFilePath,
  resolveContainerConfig: resolveSeedConfig,
  resolveAppContainerConfig: resolveSeedAppConfig,
} = createDomainConfigResolver<
  SeedCliContainerConfig,
  "seed-file",
  SeedCliValues
>({
  fileArgKey: "seed-file",
  envVar: () => process.env.SEED_FILE_PATH,
  appFileField: (a) => a.seedFile,
  defaultDir: "seeds",
  defaultFileName: "seed.yaml",
  buildConfig: (base, filePath) => ({ ...base, seedFilePath: filePath }),
});

export { resolveSeedFilePath, resolveSeedConfig, resolveSeedAppConfig };
