import { afterEach, beforeEach } from "vitest";
import type { Container } from "@/core/application/container";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import type {
  CustomizationScope,
  RemotePlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import type { FieldRight } from "@/core/domain/fieldPermission/entity";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import type { FormLayout } from "@/core/domain/formSchema/entity";
import type { FormConfigurator } from "@/core/domain/formSchema/ports/formConfigurator";
import type { SchemaStorage } from "@/core/domain/formSchema/ports/schemaStorage";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export class InMemoryFormConfigurator implements FormConfigurator {
  private fields: Map<FieldCode, FieldDefinition> = new Map();
  private layout: FormLayout = [];
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

  async getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>> {
    this.callLog.push("getFields");
    this.checkFail("getFields");
    return new Map(this.fields);
  }

  async addFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("addFields");
    this.checkFail("addFields");
    for (const field of fields) {
      this.fields.set(field.code, field);
    }
  }

  async updateFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("updateFields");
    this.checkFail("updateFields");
    for (const field of fields) {
      this.fields.set(field.code, field);
    }
  }

  async deleteFields(fieldCodes: readonly FieldCode[]): Promise<void> {
    this.callLog.push("deleteFields");
    this.checkFail("deleteFields");
    for (const code of fieldCodes) {
      this.fields.delete(code);
    }
  }

  async getLayout(): Promise<FormLayout> {
    this.callLog.push("getLayout");
    this.checkFail("getLayout");
    return [...this.layout];
  }

  async updateLayout(layout: FormLayout): Promise<void> {
    this.callLog.push("updateLayout");
    this.checkFail("updateLayout");
    this.layout = [...layout];
  }

  setFields(fields: ReadonlyMap<FieldCode, FieldDefinition>): void {
    this.fields = new Map(fields);
  }

  setLayout(layout: FormLayout): void {
    this.layout = [...layout];
  }
}

export class InMemorySchemaStorage implements SchemaStorage {
  private content = "";
  private _exists = false;
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

  async get(): Promise<{ content: string; exists: boolean }> {
    this.callLog.push("get");
    this.checkFail("get");
    return { content: this.content, exists: this._exists };
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
    return { ...this.customization };
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

export class InMemoryCustomizationStorage implements CustomizationStorage {
  private content = "";
  private _exists = false;
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

  async get(): Promise<{ content: string; exists: boolean }> {
    this.callLog.push("get");
    this.checkFail("get");
    return { content: this.content, exists: this._exists };
  }

  setContent(content: string): void {
    this.content = content;
    this._exists = true;
  }
}

export class InMemoryFieldPermissionConfigurator
  implements FieldPermissionConfigurator
{
  private permissions: {
    rights: readonly FieldRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly FieldRight[];
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

  async getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }> {
    this.callLog.push("getFieldPermissions");
    this.checkFail("getFieldPermissions");
    return { ...this.permissions };
  }

  async updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateFieldPermissions");
    this.checkFail("updateFieldPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly FieldRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryFieldPermissionStorage implements FieldPermissionStorage {
  private content = "";
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

  async get(): Promise<string> {
    this.callLog.push("get");
    this.checkFail("get");
    return this.content;
  }

  async update(content: string): Promise<void> {
    this.callLog.push("update");
    this.checkFail("update");
    this.content = content;
  }

  setContent(content: string): void {
    this.content = content;
  }
}

export type TestContainer = Container & {
  formConfigurator: InMemoryFormConfigurator;
  schemaStorage: InMemorySchemaStorage;
  appDeployer: InMemoryAppDeployer;
  customizationConfigurator: InMemoryCustomizationConfigurator;
  fileUploader: InMemoryFileUploader;
  customizationStorage: InMemoryCustomizationStorage;
  fieldPermissionConfigurator: InMemoryFieldPermissionConfigurator;
  fieldPermissionStorage: InMemoryFieldPermissionStorage;
};

export function createTestContainer(): TestContainer {
  return {
    formConfigurator: new InMemoryFormConfigurator(),
    schemaStorage: new InMemorySchemaStorage(),
    appDeployer: new InMemoryAppDeployer(),
    customizationConfigurator: new InMemoryCustomizationConfigurator(),
    fileUploader: new InMemoryFileUploader(),
    customizationStorage: new InMemoryCustomizationStorage(),
    fieldPermissionConfigurator: new InMemoryFieldPermissionConfigurator(),
    fieldPermissionStorage: new InMemoryFieldPermissionStorage(),
  };
}

export function setupTestContainer(): () => TestContainer {
  let container: TestContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    // No cleanup needed for in-memory adapters
  });

  return () => container;
}
