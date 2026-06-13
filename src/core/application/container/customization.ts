import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStateStorage } from "@/core/domain/customization/ports/customizationStateStorage";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileContentReader } from "@/core/domain/customization/ports/fileContentReader";
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

/** Ports needed by customize diff */
export type CustomizationDiffContainer = {
  configCodec: ConfigCodec;
  customizationConfigurator: CustomizationConfigurator;
  customizationStorage: CustomizationStorage;
  fileDownloader: FileDownloader;
  fileContentReader: FileContentReader;
};

/**
 * Ports needed by customize 3-way pull/push/diff. Combines the diff ports
 * (content comparison) with the file writer/uploader/deployer for pull/push, plus
 * the base snapshot + app revision storage and the remote revision reader.
 */
export type CustomizationThreeWayContainer = CustomizationDiffContainer & {
  // Base snapshot storage for 3-way diff/pull/push.
  customizationStateStorage: CustomizationStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
  // Writes pulled remote files to disk.
  fileWriter: FileWriter;
  // Uploads local files for push.
  fileUploader: FileUploader;
  // Deploys after push.
  appDeployer: AppDeployer;
};

/** Full container satisfying apply, capture, diff, and 3-way pull/push */
export type CustomizationContainer = CustomizationApplyContainer &
  CustomizationCaptureContainer &
  CustomizationDiffContainer &
  CustomizationThreeWayContainer;

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

export type CustomizationThreeWayServiceArgs<T = undefined> = ServiceArgs<
  CustomizationThreeWayContainer,
  T
>;
