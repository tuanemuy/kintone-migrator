import { join } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import type {
  CustomizationPlatform,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationServiceArgs } from "../container/customization";

export type CaptureCustomizationInput = {
  readonly basePath: string;
  readonly filePrefix: string;
};

export type CaptureCustomizationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
  readonly downloadedFileCount: number;
};

async function downloadAndSaveResources(
  resources: readonly RemoteResource[],
  platformDir: string,
  resourceType: "js" | "css",
  filePrefix: string,
  container: CustomizationServiceArgs<CaptureCustomizationInput>["container"],
): Promise<readonly CustomizationResource[]> {
  const result: CustomizationResource[] = [];
  const dir = join(platformDir, resourceType);

  for (const resource of resources) {
    if (resource.type === "URL") {
      result.push({ type: "URL", url: resource.url });
    } else {
      const fileName = resource.file.name;
      const filePath = join(dir, fileName);
      const data = await container.fileDownloader.download(
        resource.file.fileKey,
      );
      await container.fileWriter.write(filePath, data);
      const relativePath = join(filePrefix, resourceType, fileName);
      result.push({ type: "FILE", path: relativePath });
    }
  }

  return result;
}

async function downloadPlatform(
  remotePlatform: RemotePlatform,
  platformName: string,
  args: CustomizationServiceArgs<CaptureCustomizationInput>,
): Promise<{ platform: CustomizationPlatform; fileCount: number }> {
  const platformDir = join(args.input.basePath, platformName);
  const platformPrefix = join(args.input.filePrefix, platformName);

  const jsResources = await downloadAndSaveResources(
    remotePlatform.js,
    platformDir,
    "js",
    platformPrefix,
    args.container,
  );

  const cssResources = await downloadAndSaveResources(
    remotePlatform.css,
    platformDir,
    "css",
    platformPrefix,
    args.container,
  );

  const fileCount =
    remotePlatform.js.filter((r) => r.type === "FILE").length +
    remotePlatform.css.filter((r) => r.type === "FILE").length;

  return {
    platform: { js: jsResources, css: cssResources },
    fileCount,
  };
}

export async function captureCustomization(
  args: CustomizationServiceArgs<CaptureCustomizationInput>,
): Promise<CaptureCustomizationOutput> {
  const { scope, desktop, mobile } =
    await args.container.customizationConfigurator.getCustomization();

  const desktopResult = await downloadPlatform(desktop, "desktop", args);
  const mobileResult = await downloadPlatform(mobile, "mobile", args);

  const config: CustomizationConfig = {
    scope,
    desktop: desktopResult.platform,
    mobile: mobileResult.platform,
  };

  const configText = CustomizationConfigSerializer.serialize(config);
  const existing = await args.container.customizationStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
    downloadedFileCount: desktopResult.fileCount + mobileResult.fileCount,
  };
}
