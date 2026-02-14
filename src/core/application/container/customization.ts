import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type CustomizationContainer = {
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileUploader: FileUploader;
  appDeployer: AppDeployer;
};

export type CustomizationServiceArgs<T = undefined> = T extends undefined
  ? { container: CustomizationContainer }
  : { container: CustomizationContainer; input: T };
