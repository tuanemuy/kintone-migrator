import { beforeEach } from "vitest";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class TestDouble {
  callLog: string[] = [];
  private failOn: Set<string> = new Set();
  private readonly errorCode: SystemErrorCode;

  constructor(errorCode: SystemErrorCode = SystemErrorCode.ExternalApiError) {
    this.errorCode = errorCode;
  }

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  protected checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(this.errorCode, `${methodName} failed (test)`);
    }
  }
}

export class InMemoryFileStorage extends TestDouble {
  protected content = "";
  protected hasContent = false;

  constructor() {
    super(SystemErrorCode.StorageError);
  }

  async get(): Promise<StorageResult> {
    this.callLog.push("get");
    this.checkFail("get");
    if (this.hasContent) {
      return { exists: true, content: this.content };
    }
    return { exists: false };
  }

  async update(content: string): Promise<void> {
    this.callLog.push("update");
    this.checkFail("update");
    this.content = content;
    this.hasContent = true;
  }

  setContent(content: string): void {
    this.content = content;
    this.hasContent = true;
  }
}

export class InMemoryAppDeployer implements AppDeployer {
  deployCount = 0;
  shouldFail = false;

  async deploy(): Promise<void> {
    if (this.shouldFail) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Deploy failed (test)",
      );
    }
    this.deployCount++;
  }
}

export function setupContainer<T>(factory: () => T): () => T {
  let container: T;
  beforeEach(() => {
    container = factory();
  });
  return () => container;
}
