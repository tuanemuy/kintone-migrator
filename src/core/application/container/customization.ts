import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type CustomizationContainer = {
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileUploader: FileUploader;
  fileDownloader: FileDownloader;
  fileWriter: FileWriter;
  appDeployer: AppDeployer;
};

export type CustomizationServiceArgs<T = undefined> = T extends undefined
  ? { container: CustomizationContainer }
  : { container: CustomizationContainer; input: T };
