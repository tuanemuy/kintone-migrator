import { basename, extname, join } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import type {
  CustomizationPlatform,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationCaptureContainer } from "../container/customization";

export type CaptureCustomizationInput = {
  readonly basePath: string;
  readonly filePrefix: string;
};

export type CaptureCustomizationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
  readonly fileResourceCount: number;
};

type CaptureCustomizationArgs = {
  container: CustomizationCaptureContainer;
  input: CaptureCustomizationInput;
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control character match for file name sanitization
const UNSAFE_FILE_CHARS = /[<>:"|?*\u0000-\u001f]/g;

function sanitizeFileName(name: string): string {
  const base = basename(name);
  const sanitized = base.replace(UNSAFE_FILE_CHARS, "_");
  if (sanitized === "" || sanitized === "." || sanitized === "..") {
    return "_";
  }
  return sanitized;
}

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

type PlannedFile = {
  readonly fileName: string;
  readonly fileKey: string;
  readonly absolutePath: string;
};

type PlanResult = {
  readonly resources: readonly CustomizationResource[];
  readonly filesToDownload: readonly PlannedFile[];
};

function planResources(
  resources: readonly RemoteResource[],
  platformDir: string,
  resourceType: "js" | "css",
  relativeBaseDir: string,
): PlanResult {
  const planned: CustomizationResource[] = [];
  const filesToDownload: PlannedFile[] = [];
  const dir = join(platformDir, resourceType);
  const usedNames = new Set<string>();

  for (const resource of resources) {
    if (resource.type === "URL") {
      planned.push({ type: "URL", url: resource.url });
    } else {
      const fileName = deduplicateFileName(
        sanitizeFileName(resource.file.name),
        usedNames,
      );
      const absolutePath = join(dir, fileName);
      const relativePath = join(relativeBaseDir, resourceType, fileName);
      planned.push({ type: "FILE", path: relativePath });
      filesToDownload.push({
        fileName,
        fileKey: resource.file.fileKey,
        absolutePath,
      });
    }
  }

  return { resources: planned, filesToDownload };
}

function planPlatform(
  remotePlatform: RemotePlatform,
  platformName: string,
  args: CaptureCustomizationArgs,
): {
  platform: CustomizationPlatform;
  filesToDownload: readonly PlannedFile[];
  fileCount: number;
} {
  const platformDir = join(args.input.basePath, platformName);
  const platformPrefix = join(args.input.filePrefix, platformName);

  const jsPlan = planResources(
    remotePlatform.js,
    platformDir,
    "js",
    platformPrefix,
  );
  const cssPlan = planResources(
    remotePlatform.css,
    platformDir,
    "css",
    platformPrefix,
  );

  const fileCount =
    remotePlatform.js.filter((r) => r.type === "FILE").length +
    remotePlatform.css.filter((r) => r.type === "FILE").length;

  return {
    platform: { js: jsPlan.resources, css: cssPlan.resources },
    filesToDownload: [...jsPlan.filesToDownload, ...cssPlan.filesToDownload],
    fileCount,
  };
}

async function downloadFiles(
  files: readonly PlannedFile[],
  container: CustomizationCaptureContainer,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      const data = await container.fileDownloader.download(file.fileKey);
      await container.fileWriter.write(file.absolutePath, data);
    }),
  );
}

export async function captureCustomization(
  args: CaptureCustomizationArgs,
): Promise<CaptureCustomizationOutput> {
  // Check existing config *before* downloading files so callers can act on it early
  const existing = await args.container.customizationStorage.get();

  const { scope, desktop, mobile } =
    await args.container.customizationConfigurator.getCustomization();

  // Phase 1: Plan file paths and build config (no I/O yet)
  const desktopPlan = planPlatform(desktop, "desktop", args);
  const mobilePlan = planPlatform(mobile, "mobile", args);

  const config: CustomizationConfig = {
    scope,
    desktop: desktopPlan.platform,
    mobile: mobilePlan.platform,
  };

  const configText = CustomizationConfigSerializer.serialize(config);

  // Phase 2: Download and write files
  const allFiles = [
    ...desktopPlan.filesToDownload,
    ...mobilePlan.filesToDownload,
  ];
  await downloadFiles(allFiles, args.container);

  return {
    configText,
    hasExistingConfig: existing.exists,
    fileResourceCount: desktopPlan.fileCount + mobilePlan.fileCount,
  };
}
