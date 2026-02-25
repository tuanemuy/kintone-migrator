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
} = createDomainConfigResolver<"seed-file", "seedFilePath", SeedCliValues>({
  fileArgKey: "seed-file",
  envVar: () => process.env.SEED_FILE_PATH,
  appFileField: (a) => a.seedFile,
  defaultDir: "seeds",
  defaultFileName: "seed.yaml",
  filePathKey: "seedFilePath",
});

export { resolveSeedFilePath, resolveSeedConfig, resolveSeedAppConfig };
