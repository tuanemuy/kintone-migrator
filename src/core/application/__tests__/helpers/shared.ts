import { beforeEach } from "vitest";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export class FakeBase {
  callLog: string[] = [];
  private failOn: Set<string> = new Set();
  private readonly errorCode: SystemErrorCode;

  constructor(errorCode: SystemErrorCode = SystemErrorCode.ExternalApiError) {
    this.errorCode = errorCode;
  }

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  protected record(methodName: string): void {
    this.callLog.push(methodName);
    if (this.failOn.has(methodName)) {
      throw new SystemError(this.errorCode, `${methodName} failed (test)`);
    }
  }
}

export class InMemoryFileStorage extends FakeBase {
  private content = "";
  private hasContent = false;

  constructor() {
    super(SystemErrorCode.StorageError);
  }

  async get(): Promise<StorageResult> {
    this.record("get");
    if (this.hasContent) {
      return { exists: true, content: this.content };
    }
    return { exists: false };
  }

  async update(content: string): Promise<void> {
    this.record("update");
    this.content = content;
    this.hasContent = true;
  }

  setContent(content: string): void {
    this.content = content;
    this.hasContent = true;
  }
}

export class InMemoryAppDeployer extends FakeBase implements AppDeployer {
  deployCount = 0;

  async deploy(): Promise<void> {
    this.record("deploy");
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
