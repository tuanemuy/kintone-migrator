import { beforeEach } from "vitest";
import type { CustomizationContainer } from "@/core/application/container/customization";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import type {
  CustomizationScope,
  RemotePlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryCustomizationConfigurator
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
  callLog: string[] = [];
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
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `${methodName} failed (test)`,
      );
    }
  }

  async getCustomization(): Promise<{
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }> {
    this.callLog.push("getCustomization");
    this.checkFail("getCustomization");
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
    this.callLog.push("updateCustomization");
    this.checkFail("updateCustomization");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.customization.revision) + 1);
    this.customization.revision = newRevision;
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

export class InMemoryFileUploader implements FileUploader {
  private fileKeyCounter = 0;
  uploadedFiles: Map<string, string> = new Map();
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `${methodName} failed (test)`,
      );
    }
  }

  async upload(filePath: string): Promise<{ fileKey: string }> {
    this.callLog.push("upload");
    this.checkFail("upload");
    this.fileKeyCounter++;
    const fileKey = `fk-${this.fileKeyCounter}`;
    this.uploadedFiles.set(filePath, fileKey);
    return { fileKey };
  }
}

export class InMemoryCustomizationStorage
  extends InMemoryFileStorage
  implements CustomizationStorage {}

export class InMemoryFileDownloader implements FileDownloader {
  private files: Map<string, ArrayBuffer> = new Map();
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `${methodName} failed (test)`,
      );
    }
  }

  async download(fileKey: string): Promise<ArrayBuffer> {
    this.callLog.push("download");
    this.checkFail("download");
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

export class InMemoryFileWriter implements FileWriter {
  writtenFiles: Map<string, ArrayBuffer> = new Map();
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `${methodName} failed (test)`,
      );
    }
  }

  async write(filePath: string, data: ArrayBuffer): Promise<void> {
    this.callLog.push("write");
    this.checkFail("write");
    this.writtenFiles.set(filePath, data);
  }
}

export type TestCustomizationContainer = CustomizationContainer & {
  customizationConfigurator: InMemoryCustomizationConfigurator;
  customizationStorage: InMemoryCustomizationStorage;
  fileUploader: InMemoryFileUploader;
  fileDownloader: InMemoryFileDownloader;
  fileWriter: InMemoryFileWriter;
  appDeployer: InMemoryAppDeployer;
};

export function createTestCustomizationContainer(): TestCustomizationContainer {
  return {
    customizationConfigurator: new InMemoryCustomizationConfigurator(),
    customizationStorage: new InMemoryCustomizationStorage(),
    fileUploader: new InMemoryFileUploader(),
    fileDownloader: new InMemoryFileDownloader(),
    fileWriter: new InMemoryFileWriter(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestCustomizationContainer(): () => TestCustomizationContainer {
  let container: TestCustomizationContainer;

  beforeEach(() => {
    container = createTestCustomizationContainer();
  });

  return () => container;
}
