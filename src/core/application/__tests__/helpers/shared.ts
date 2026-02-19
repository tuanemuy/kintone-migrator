import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { StorageResult } from "@/core/domain/ports/storageResult";

export abstract class InMemoryFileStorage {
  protected content = "";
  protected _exists = false;
  callLog: string[] = [];
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  protected checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `${methodName} failed (test)`,
      );
    }
  }

  async get(): Promise<StorageResult> {
    this.callLog.push("get");
    this.checkFail("get");
    if (this._exists) {
      return { exists: true, content: this.content };
    }
    return { exists: false };
  }

  async update(content: string): Promise<void> {
    this.callLog.push("update");
    this.checkFail("update");
    this.content = content;
    this._exists = true;
  }

  setContent(content: string): void {
    this.content = content;
    this._exists = true;
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
