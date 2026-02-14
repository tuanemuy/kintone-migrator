import type {
  RemoteResource,
  ResolvedResource,
  UploadedFileResource,
} from "../valueObject";

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
