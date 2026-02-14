import { basename, resolve } from "node:path";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { CustomizationErrorCode } from "@/core/domain/customization/errorCode";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import { ResourceMerger } from "@/core/domain/customization/services/resourceMerger";
import type {
  CustomizationPlatform,
  CustomizationResource,
  RemotePlatform,
  RemoteResource,
  ResolvedPlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import { BusinessRuleError } from "@/core/domain/error";
import type { ServiceArgs } from "../types";
import { parseConfigText } from "./parseConfig";

const MAX_RESOURCES_PER_CATEGORY = 30;

type ApplyCustomizationInput = {
  basePath: string;
};

async function resolveResources(
  platform: CustomizationPlatform,
  basePath: string,
  fileUploader: FileUploader,
): Promise<ResolvedPlatform> {
  const resolveList = async (
    resources: readonly CustomizationResource[],
  ): Promise<readonly ResolvedResource[]> => {
    const resolved: ResolvedResource[] = [];
    for (const resource of resources) {
      if (resource.type === "URL") {
        resolved.push(resource);
      } else {
        const absolutePath = resolve(basePath, resource.path);
        const { fileKey } = await fileUploader.upload(absolutePath);
        resolved.push({
          type: "FILE",
          fileKey,
          name: basename(resource.path),
        });
      }
    }
    return resolved;
  };

  const [js, css] = await Promise.all([
    resolveList(platform.js),
    resolveList(platform.css),
  ]);

  return { js, css };
}

function mergePlatform(
  current: RemotePlatform,
  incoming: ResolvedPlatform,
): ResolvedPlatform {
  return {
    js: ResourceMerger.mergeResources(current.js, incoming.js),
    css: ResourceMerger.mergeResources(current.css, incoming.css),
  };
}

function validateResourceCount(
  label: string,
  resources: readonly RemoteResource[] | readonly ResolvedResource[],
): void {
  if (resources.length > MAX_RESOURCES_PER_CATEGORY) {
    throw new BusinessRuleError(
      CustomizationErrorCode.TooManyFiles,
      `${label} has ${resources.length} resources, exceeding the maximum of ${MAX_RESOURCES_PER_CATEGORY}`,
    );
  }
}

export async function applyCustomization({
  container,
  input,
}: ServiceArgs<ApplyCustomizationInput>): Promise<void> {
  const result = await container.customizationStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Customization config file not found",
    );
  }
  const config = parseConfigText(result.content);

  const currentCustomization =
    await container.customizationConfigurator.getCustomization();

  const [resolvedDesktop, resolvedMobile] = await Promise.all([
    resolveResources(config.desktop, input.basePath, container.fileUploader),
    resolveResources(config.mobile, input.basePath, container.fileUploader),
  ]);

  const mergedDesktop = mergePlatform(
    currentCustomization.desktop,
    resolvedDesktop,
  );
  const mergedMobile = mergePlatform(
    currentCustomization.mobile,
    resolvedMobile,
  );

  validateResourceCount("desktop.js", mergedDesktop.js);
  validateResourceCount("desktop.css", mergedDesktop.css);
  validateResourceCount("mobile.js", mergedMobile.js);
  validateResourceCount("mobile.css", mergedMobile.css);

  await container.customizationConfigurator.updateCustomization({
    scope: config.scope,
    desktop: {
      js: mergedDesktop.js,
      css: mergedDesktop.css,
    },
    mobile: {
      js: mergedMobile.js,
      css: mergedMobile.css,
    },
    revision: currentCustomization.revision,
  });
}
