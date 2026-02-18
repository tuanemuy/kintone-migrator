import { basename, resolve } from "node:path";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import { ResourceMerger } from "@/core/domain/customization/services/resourceMerger";
import type {
  CustomizationPlatform,
  CustomizationResource,
  RemotePlatform,
  ResolvedPlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import type { CustomizationApplyServiceArgs } from "../container/customization";
import { parseConfigText } from "./parseConfig";

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
    return Promise.all(
      resources.map(async (resource): Promise<ResolvedResource> => {
        if (resource.type === "URL") {
          return resource;
        }
        const absolutePath = resolve(basePath, resource.path);
        const { fileKey } = await fileUploader.upload(absolutePath);
        return {
          type: "FILE",
          fileKey,
          name: basename(resource.path),
        };
      }),
    );
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

export async function applyCustomization({
  container,
  input,
}: CustomizationApplyServiceArgs<ApplyCustomizationInput>): Promise<void> {
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

  ResourceMerger.assertResourceCount("desktop.js", mergedDesktop.js);
  ResourceMerger.assertResourceCount("desktop.css", mergedDesktop.css);
  ResourceMerger.assertResourceCount("mobile.js", mergedMobile.js);
  ResourceMerger.assertResourceCount("mobile.css", mergedMobile.css);

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
