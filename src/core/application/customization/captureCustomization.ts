import { basename, extname, join } from "node:path";
import type { CustomizationConfig } from "@/core/domain/customization/entity";
import { CustomizationConfigSerializer } from "@/core/domain/customization/services/configSerializer";
import type {
  CustomizationPlatform,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
} from "@/core/domain/customization/valueObject";
import { deduplicateName } from "@/lib/deduplicateName";
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

/**
 * Deduplicate a file name by inserting a counter between the stem and extension.
 *
 * Unlike {@link deduplicateName} from `@/lib/deduplicateName`, this function is
 * file-name-aware: it inserts the counter before the extension (e.g. `file_1.js`)
 * rather than appending it at the end (which would produce `file.js_1`).
 * This extension-aware behavior cannot be achieved by the generic lib utility,
 * so a local implementation is necessary.
 */
function deduplicateFileName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const ext = extname(baseName);
  const stem = baseName.slice(0, baseName.length - ext.length);
  const dedupedStem = deduplicateName(
    stem || "_",
    usedStemsFor(usedNames, ext),
    {
      separator: "_",
      startCounter: 1,
    },
  );
  const result = `${dedupedStem}${ext}`;
  usedNames.add(result);
  return result;
}

/**
 * Build a derived set of stems that are already taken for a given extension.
 * This allows {@link deduplicateName} to find the next available counter.
 */
function usedStemsFor(usedNames: Set<string>, ext: string): Set<string> {
  const stems = new Set<string>();
  for (const name of usedNames) {
    if (name.endsWith(ext)) {
      stems.add(name.slice(0, name.length - ext.length));
    }
  }
  return stems;
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
  const platformDir = join(
    args.input.basePath,
    args.input.filePrefix,
    platformName,
  );
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

/**
 * Download all planned files concurrently.
 *
 * On partial failure, already-written files remain on disk. This is safe because
 * retry is idempotent — files are overwritten on subsequent runs. The caller does
 * not persist the config YAML until this function completes successfully, so a
 * failed run will not leave an inconsistent config-to-files state.
 */
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
