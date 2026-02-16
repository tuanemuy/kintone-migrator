import { BusinessRuleError } from "../../error";
import { CustomizationErrorCode } from "../errorCode";
import type {
  RemoteResource,
  ResolvedResource,
  UploadedFileResource,
} from "../valueObject";

const MAX_RESOURCES_PER_CATEGORY = 30;

function remoteToResolved(resource: RemoteResource): ResolvedResource {
  if (resource.type === "URL") {
    return resource;
  }
  return {
    type: "FILE",
    fileKey: resource.file.fileKey,
    name: resource.file.name,
  } satisfies UploadedFileResource;
}

export const ResourceMerger = {
  assertResourceCount: (
    label: string,
    resources: readonly RemoteResource[] | readonly ResolvedResource[],
  ): void => {
    if (resources.length > MAX_RESOURCES_PER_CATEGORY) {
      throw new BusinessRuleError(
        CustomizationErrorCode.CzTooManyFiles,
        `${label} has ${resources.length} resources, exceeding the maximum of ${MAX_RESOURCES_PER_CATEGORY}`,
      );
    }
  },

  mergeResources: (
    current: readonly RemoteResource[],
    incoming: readonly ResolvedResource[],
  ): readonly ResolvedResource[] => {
    const incomingFileNames = new Set<string>();
    const incomingUrls = new Set<string>();

    for (const resource of incoming) {
      if (resource.type === "FILE") {
        incomingFileNames.add(resource.name);
      } else {
        incomingUrls.add(resource.url);
      }
    }

    const kept: ResolvedResource[] = [];
    for (const resource of current) {
      if (resource.type === "FILE") {
        if (!incomingFileNames.has(resource.file.name)) {
          kept.push(remoteToResolved(resource));
        }
      } else {
        if (!incomingUrls.has(resource.url)) {
          kept.push(resource);
        }
      }
    }

    return [...kept, ...incoming];
  },
};
