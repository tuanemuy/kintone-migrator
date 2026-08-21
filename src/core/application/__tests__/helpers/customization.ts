import type { CustomizationContainer } from "@/core/application/container/customization";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStateStorage } from "@/core/domain/customization/ports/customizationStateStorage";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileContentReader } from "@/core/domain/customization/ports/fileContentReader";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import type {
  CustomizationScope,
  RemotePlatform,
  RemoteResource,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryAppRevisionReader,
  InMemoryAppRevisionStorage,
  InMemoryFileStorage,
  setupContainer,
  testConfigCodec,
} from "./shared";

/**
 * Local disk shared by the file reader, writer and uploader, so "write a file
 * then read it back" and "upload what is on disk" behave like the real adapters
 * instead of returning synthesized content.
 */
export class InMemoryLocalFiles {
  private readonly files: Map<string, ArrayBuffer> = new Map();

  get(filePath: string): ArrayBuffer | undefined {
    return this.files.get(filePath);
  }

  set(filePath: string, data: ArrayBuffer): void {
    this.files.set(filePath, data);
  }
}

export class InMemoryCustomizationConfigurator
  extends FakeBase
  implements CustomizationConfigurator
{
  private customization: {
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  } = {
    scope: "ALL",
    desktop: { js: [], css: [] },
    mobile: { js: [], css: [] },
    revision: "1",
  };
  lastUpdateParams: {
    scope?: CustomizationScope;
    desktop?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    mobile?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    revision?: string;
  } | null = null;

  async getCustomization(): Promise<{
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }> {
    this.trackCall("getCustomization");
    return structuredClone(this.customization);
  }

  async updateCustomization(params: {
    scope?: CustomizationScope;
    desktop?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    mobile?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateCustomization");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.customization.revision) + 1);
    // Reflect the update into the stored customization: a subsequent
    // getCustomization must observe what was just pushed, otherwise a
    // push → diff round trip would compare against stale remote content.
    this.customization = {
      scope: params.scope ?? this.customization.scope,
      desktop: applyPlatformUpdate(this.customization.desktop, params.desktop),
      mobile: applyPlatformUpdate(this.customization.mobile, params.mobile),
      revision: newRevision,
    };
    return { revision: newRevision };
  }

  setCustomization(customization: {
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }): void {
    this.customization = customization;
  }
}

function toRemoteResource(resource: ResolvedResource): RemoteResource {
  if (resource.type === "URL") {
    return resource;
  }
  return {
    type: "FILE",
    file: {
      fileKey: resource.fileKey,
      name: resource.name,
      contentType: "application/octet-stream",
      size: "1",
    },
  };
}

function applyPlatformUpdate(
  current: RemotePlatform,
  update:
    | {
        js?: readonly ResolvedResource[];
        css?: readonly ResolvedResource[];
      }
    | undefined,
): RemotePlatform {
  if (update === undefined) {
    return current;
  }
  return {
    js: update.js === undefined ? current.js : update.js.map(toRemoteResource),
    css:
      update.css === undefined ? current.css : update.css.map(toRemoteResource),
  };
}

export class InMemoryFileUploader extends FakeBase implements FileUploader {
  private fileKeyCounter = 0;
  uploadedFiles: Map<string, string> = new Map();

  constructor(
    private readonly localFiles: InMemoryLocalFiles,
    private readonly downloader: InMemoryFileDownloader,
  ) {
    super();
  }

  async upload(filePath: string): Promise<{ fileKey: string }> {
    this.trackCall("upload");
    this.fileKeyCounter++;
    const fileKey = `fk-${this.fileKeyCounter}`;
    this.uploadedFiles.set(filePath, fileKey);
    // The uploaded bytes become downloadable under the issued fileKey, so the
    // remote side of a later diff sees the content that was actually pushed.
    const data = this.localFiles.get(filePath);
    if (data !== undefined) {
      this.downloader.setFile(fileKey, data);
    }
    return { fileKey };
  }
}

/**
 * Reads back what is on the shared local disk (`InMemoryLocalFiles`).
 *
 * The disk holds only what a test put there: `setFile(path, bytes)` on this
 * reader, or a `write` performed by `InMemoryFileWriter` (so files produced by
 * pull are readable afterwards). Paths are matched exactly as the production
 * code resolves them, which is `resolve(basePath, resource.path)` — seed with
 * the same absolute path the use case will read, otherwise the read fails.
 *
 * A path that was never seeded fails like a missing file rather than yielding
 * synthesized bytes, so a test that forgets to seed cannot pass by reading
 * content that does not exist.
 */
export class InMemoryFileContentReader
  extends FakeBase
  implements FileContentReader
{
  private readonly failingPaths: Set<string> = new Set();

  constructor(private readonly localFiles: InMemoryLocalFiles) {
    super(SystemErrorCode.StorageError);
  }

  async read(filePath: string): Promise<ArrayBuffer> {
    this.trackCall("read");
    if (this.failingPaths.has(filePath)) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `read failed for ${filePath} (test)`,
      );
    }
    const data = this.localFiles.get(filePath);
    if (data === undefined) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `no file seeded at ${filePath} (test)`,
      );
    }
    return data;
  }

  setFile(filePath: string, data: ArrayBuffer): void {
    this.localFiles.set(filePath, data);
  }

  /**
   * Makes a single path unreadable even if it was seeded. `FakeBase.setFailOn`
   * fails every `read`, which cannot express "one declared file is missing from
   * disk".
   */
  setFailure(filePath: string): void {
    this.failingPaths.add(filePath);
  }
}

export class InMemoryCustomizationStorage
  extends InMemoryFileStorage
  implements CustomizationStorage {}

export class InMemoryCustomizationStateStorage
  extends InMemoryFileStorage
  implements CustomizationStateStorage {}

export class InMemoryFileDownloader extends FakeBase implements FileDownloader {
  private files: Map<string, ArrayBuffer> = new Map();

  async download(fileKey: string): Promise<ArrayBuffer> {
    this.trackCall("download");
    const data = this.files.get(fileKey);
    if (data === undefined) {
      return new TextEncoder().encode(`content-of-${fileKey}`).buffer;
    }
    return data;
  }

  setFile(fileKey: string, data: ArrayBuffer): void {
    this.files.set(fileKey, data);
  }
}

export class InMemoryFileWriter extends FakeBase implements FileWriter {
  /** Only the paths this writer wrote, so callers can assert what pull produced. */
  writtenFiles: Map<string, ArrayBuffer> = new Map();

  constructor(private readonly localFiles: InMemoryLocalFiles) {
    super(SystemErrorCode.StorageError);
  }

  async write(filePath: string, data: ArrayBuffer): Promise<void> {
    this.trackCall("write");
    this.writtenFiles.set(filePath, data);
    // Also land on the shared disk so a later read sees the written bytes.
    this.localFiles.set(filePath, data);
  }
}

export type TestCustomizationContainer = CustomizationContainer & {
  customizationConfigurator: InMemoryCustomizationConfigurator;
  customizationStorage: InMemoryCustomizationStorage;
  customizationStateStorage: InMemoryCustomizationStateStorage;
  appRevisionStorage: InMemoryAppRevisionStorage;
  appRevisionReader: InMemoryAppRevisionReader;
  fileUploader: InMemoryFileUploader;
  fileDownloader: InMemoryFileDownloader;
  fileContentReader: InMemoryFileContentReader;
  fileWriter: InMemoryFileWriter;
  appDeployer: InMemoryAppDeployer;
};

export function createTestCustomizationContainer(): TestCustomizationContainer {
  const localFiles = new InMemoryLocalFiles();
  const fileDownloader = new InMemoryFileDownloader();
  return {
    configCodec: testConfigCodec,
    customizationConfigurator: new InMemoryCustomizationConfigurator(),
    customizationStorage: new InMemoryCustomizationStorage(),
    customizationStateStorage: new InMemoryCustomizationStateStorage(),
    appRevisionStorage: new InMemoryAppRevisionStorage(),
    appRevisionReader: new InMemoryAppRevisionReader(),
    fileUploader: new InMemoryFileUploader(localFiles, fileDownloader),
    fileDownloader,
    fileContentReader: new InMemoryFileContentReader(localFiles),
    fileWriter: new InMemoryFileWriter(localFiles),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestCustomizationContainer(): () => TestCustomizationContainer {
  return setupContainer(createTestCustomizationContainer);
}
