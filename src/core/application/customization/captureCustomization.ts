import { extname, join } from "node:path";
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

function deduplicateFileName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const ext = extname(baseName);
  const stem = baseName.slice(0, baseName.length - ext.length);
  let counter = 1;
  let candidate = `${stem}_${counter}${ext}`;
  while (usedNames.has(candidate)) {
    counter++;
    candidate = `${stem}_${counter}${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

async function downloadAndSaveResources(
  resources: readonly RemoteResource[],
  platformDir: string,
  resourceType: "js" | "css",
  relativeBaseDir: string,
  container: CustomizationServiceArgs<CaptureCustomizationInput>["container"],
): Promise<readonly CustomizationResource[]> {
  const result: CustomizationResource[] = [];
  const dir = join(platformDir, resourceType);
  const usedNames = new Set<string>();

  for (const resource of resources) {
    if (resource.type === "URL") {
      result.push({ type: "URL", url: resource.url });
    } else {
      const fileName = deduplicateFileName(resource.file.name, usedNames);
      const filePath = join(dir, fileName);
      const data = await container.fileDownloader.download(
        resource.file.fileKey,
      );
      await container.fileWriter.write(filePath, data);
      const relativePath = join(relativeBaseDir, resourceType, fileName);
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
