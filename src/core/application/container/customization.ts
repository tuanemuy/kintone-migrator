import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

/** Ports needed by customize apply */
export type CustomizationApplyContainer = {
  configCodec: ConfigCodec;
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileUploader: FileUploader;
  appDeployer: AppDeployer;
};

/** Ports needed by customize capture / save */
export type CustomizationCaptureContainer = {
  configCodec: ConfigCodec;
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileDownloader: FileDownloader;
  fileWriter: FileWriter;
};

/** Ports needed by customize diff (subset of apply) */
export type CustomizationDiffContainer = {
  configCodec: ConfigCodec;
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
};

/** Full container satisfying both apply and capture */
export type CustomizationContainer = CustomizationApplyContainer &
  CustomizationCaptureContainer;

export type CustomizationApplyServiceArgs<T = undefined> = ServiceArgs<
  CustomizationApplyContainer,
  T
>;

export type CustomizationCaptureServiceArgs<T = undefined> = ServiceArgs<
  CustomizationCaptureContainer,
  T
>;

export type CustomizationDiffServiceArgs<T = undefined> = ServiceArgs<
  CustomizationDiffContainer,
  T
>;
