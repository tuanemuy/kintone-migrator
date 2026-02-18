import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

/** Ports needed by customize apply */
export type CustomizationApplyContainer = {
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileUploader: FileUploader;
  appDeployer: AppDeployer;
};

/** Ports needed by customize capture / save */
export type CustomizationCaptureContainer = {
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileDownloader: FileDownloader;
  fileWriter: FileWriter;
};

/** Full container satisfying both apply and capture */
export type CustomizationContainer = CustomizationApplyContainer &
  CustomizationCaptureContainer;

export type CustomizationApplyServiceArgs<T = undefined> = T extends undefined
  ? { container: CustomizationApplyContainer }
  : { container: CustomizationApplyContainer; input: T };
