import { beforeEach } from "vitest";
import type { Container } from "@/core/application/container";
import type { ActionContainer } from "@/core/application/container/action";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import type { CustomizationContainer } from "@/core/application/container/customization";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import type { GeneralSettingsContainer } from "@/core/application/container/generalSettings";
import type { NotificationContainer } from "@/core/application/container/notification";
import type { PluginContainer } from "@/core/application/container/plugin";
import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { ReportContainer } from "@/core/application/container/report";
import type { SeedContainer } from "@/core/application/container/seed";
import type { ViewContainer } from "@/core/application/container/view";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ActionConfig } from "@/core/domain/action/entity";
import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
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
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type {
  GeneralNotification,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import type { ReportConfig } from "@/core/domain/report/entity";
import type { ReportConfigurator } from "@/core/domain/report/ports/reportConfigurator";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import type { SeedRecordWithId } from "@/core/domain/seedData/entity";
import type { RecordManager } from "@/core/domain/seedData/ports/recordManager";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";
import type { SeedRecord } from "@/core/domain/seedData/valueObject";
import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";

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
      if (field.type === "SUBTABLE") {
        const existing = this.fields.get(field.code);
        if (existing !== undefined && existing.type === "SUBTABLE") {
          const mergedInner = new Map(existing.properties.fields);
          for (const [code, def] of field.properties.fields) {
            mergedInner.set(code, def);
          }
          this.fields.set(field.code, {
            ...existing,
            properties: { fields: mergedInner },
          });
          continue;
        }
      }
      this.fields.set(field.code, field);
    }
  }

  async updateFields(fields: readonly FieldDefinition[]): Promise<void> {
    this.callLog.push("updateFields");
    this.checkFail("updateFields");
    for (const field of fields) {
      if (field.type === "SUBTABLE") {
        const existing = this.fields.get(field.code);
        if (existing !== undefined && existing.type === "SUBTABLE") {
          const mergedInner = new Map(existing.properties.fields);
          for (const [code, def] of field.properties.fields) {
            mergedInner.set(code, def);
          }
          this.fields.set(field.code, {
            ...field,
            properties: { fields: mergedInner },
          });
          continue;
        }
      }
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

export type TestContainer = Container & {
  formConfigurator: InMemoryFormConfigurator;
  schemaStorage: InMemorySchemaStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestContainer(): TestContainer {
  return {
    formConfigurator: new InMemoryFormConfigurator(),
    schemaStorage: new InMemorySchemaStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestContainer(): () => TestContainer {
  let container: TestContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  return () => container;
}

// Seed data test helpers

export class InMemoryRecordManager implements RecordManager {
  private records: SeedRecordWithId[] = [];
  private nextId = 1;
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

  async getAllRecords(
    _condition?: string,
  ): Promise<readonly SeedRecordWithId[]> {
    this.callLog.push("getAllRecords");
    this.checkFail("getAllRecords");
    return [...this.records];
  }

  async addRecords(records: readonly SeedRecord[]): Promise<void> {
    this.callLog.push("addRecords");
    this.checkFail("addRecords");
    for (const record of records) {
      const id = String(this.nextId++);
      this.records.push({ id, record });
    }
  }

  async updateRecords(
    records: readonly {
      id: string;
      record: SeedRecord;
    }[],
  ): Promise<void> {
    this.callLog.push("updateRecords");
    this.checkFail("updateRecords");
    for (const { id, record } of records) {
      const index = this.records.findIndex((r) => r.id === id);
      if (index !== -1) {
        this.records[index] = { id, record };
      }
    }
  }

  async deleteAllRecords(): Promise<{ deletedCount: number }> {
    this.callLog.push("deleteAllRecords");
    this.checkFail("deleteAllRecords");
    const deletedCount = this.records.length;
    this.records = [];
    return { deletedCount };
  }

  setRecords(records: SeedRecordWithId[]): void {
    this.records = [...records];
  }
}

export class InMemorySeedStorage implements SeedStorage {
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

export type TestSeedContainer = SeedContainer & {
  recordManager: InMemoryRecordManager;
  seedStorage: InMemorySeedStorage;
};

export function createTestSeedContainer(): TestSeedContainer {
  return {
    recordManager: new InMemoryRecordManager(),
    seedStorage: new InMemorySeedStorage(),
  };
}

export function setupTestSeedContainer(): () => TestSeedContainer {
  let container: TestSeedContainer;

  beforeEach(() => {
    container = createTestSeedContainer();
  });

  return () => container;
}

// Field permission test helpers

export type TestFieldPermissionContainer = FieldPermissionContainer & {
  fieldPermissionConfigurator: InMemoryFieldPermissionConfigurator;
  fieldPermissionStorage: InMemoryFieldPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestFieldPermissionContainer(): TestFieldPermissionContainer {
  return {
    fieldPermissionConfigurator: new InMemoryFieldPermissionConfigurator(),
    fieldPermissionStorage: new InMemoryFieldPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestFieldPermissionContainer(): () => TestFieldPermissionContainer {
  let container: TestFieldPermissionContainer;

  beforeEach(() => {
    container = createTestFieldPermissionContainer();
  });

  return () => container;
}

// Customization test helpers

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

// Record permission test helpers

export class InMemoryRecordPermissionConfigurator
  implements RecordPermissionConfigurator
{
  private permissions: {
    rights: readonly RecordRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly RecordRight[];
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

  async getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }> {
    this.callLog.push("getRecordPermissions");
    this.checkFail("getRecordPermissions");
    return { ...this.permissions };
  }

  async updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateRecordPermissions");
    this.checkFail("updateRecordPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly RecordRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryRecordPermissionStorage
  implements RecordPermissionStorage
{
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

export type TestRecordPermissionContainer = RecordPermissionContainer & {
  recordPermissionConfigurator: InMemoryRecordPermissionConfigurator;
  recordPermissionStorage: InMemoryRecordPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestRecordPermissionContainer(): TestRecordPermissionContainer {
  return {
    recordPermissionConfigurator: new InMemoryRecordPermissionConfigurator(),
    recordPermissionStorage: new InMemoryRecordPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestRecordPermissionContainer(): () => TestRecordPermissionContainer {
  let container: TestRecordPermissionContainer;

  beforeEach(() => {
    container = createTestRecordPermissionContainer();
  });

  return () => container;
}

// View test helpers

export class InMemoryViewConfigurator implements ViewConfigurator {
  private views: Record<string, ViewConfig> = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    views: Readonly<Record<string, ViewConfig>>;
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

  async getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }> {
    this.callLog.push("getViews");
    this.checkFail("getViews");
    return { views: { ...this.views }, revision: this.revision };
  }

  async updateViews(params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateViews");
    this.checkFail("updateViews");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setViews(views: Record<string, ViewConfig>, revision?: string): void {
    this.views = { ...views };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryViewStorage implements ViewStorage {
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

export type TestViewContainer = ViewContainer & {
  viewConfigurator: InMemoryViewConfigurator;
  viewStorage: InMemoryViewStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestViewContainer(): TestViewContainer {
  return {
    viewConfigurator: new InMemoryViewConfigurator(),
    viewStorage: new InMemoryViewStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestViewContainer(): () => TestViewContainer {
  let container: TestViewContainer;

  beforeEach(() => {
    container = createTestViewContainer();
  });

  return () => container;
}

// Process management test helpers

export class InMemoryProcessManagementConfigurator
  implements ProcessManagementConfigurator
{
  private config: ProcessManagementConfig = {
    enable: false,
    states: {},
    actions: [],
  };
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: ProcessManagementConfig;
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

  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    this.callLog.push("getProcessManagement");
    this.checkFail("getProcessManagement");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateProcessManagement");
    this.checkFail("updateProcessManagement");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: ProcessManagementConfig, revision?: string): void {
    this.config = config;
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryProcessManagementStorage
  implements ProcessManagementStorage
{
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

export type TestProcessManagementContainer = ProcessManagementContainer & {
  processManagementConfigurator: InMemoryProcessManagementConfigurator;
  processManagementStorage: InMemoryProcessManagementStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestProcessManagementContainer(): TestProcessManagementContainer {
  return {
    processManagementConfigurator: new InMemoryProcessManagementConfigurator(),
    processManagementStorage: new InMemoryProcessManagementStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestProcessManagementContainer(): () => TestProcessManagementContainer {
  let container: TestProcessManagementContainer;

  beforeEach(() => {
    container = createTestProcessManagementContainer();
  });

  return () => container;
}

// App permission test helpers

export class InMemoryAppPermissionConfigurator
  implements AppPermissionConfigurator
{
  private permissions: {
    rights: readonly AppRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly AppRight[];
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

  async getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }> {
    this.callLog.push("getAppPermissions");
    this.checkFail("getAppPermissions");
    return { ...this.permissions };
  }

  async updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateAppPermissions");
    this.checkFail("updateAppPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly AppRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryAppPermissionStorage implements AppPermissionStorage {
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

export type TestAppPermissionContainer = AppPermissionContainer & {
  appPermissionConfigurator: InMemoryAppPermissionConfigurator;
  appPermissionStorage: InMemoryAppPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAppPermissionContainer(): TestAppPermissionContainer {
  return {
    appPermissionConfigurator: new InMemoryAppPermissionConfigurator(),
    appPermissionStorage: new InMemoryAppPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAppPermissionContainer(): () => TestAppPermissionContainer {
  let container: TestAppPermissionContainer;

  beforeEach(() => {
    container = createTestAppPermissionContainer();
  });

  return () => container;
}

// General settings test helpers

export class InMemoryGeneralSettingsConfigurator
  implements GeneralSettingsConfigurator
{
  private config: GeneralSettingsConfig = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: GeneralSettingsConfig;
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

  async getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }> {
    this.callLog.push("getGeneralSettings");
    this.checkFail("getGeneralSettings");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateGeneralSettings");
    this.checkFail("updateGeneralSettings");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: GeneralSettingsConfig, revision?: string): void {
    this.config = { ...config };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryGeneralSettingsStorage implements GeneralSettingsStorage {
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

export type TestGeneralSettingsContainer = GeneralSettingsContainer & {
  generalSettingsConfigurator: InMemoryGeneralSettingsConfigurator;
  generalSettingsStorage: InMemoryGeneralSettingsStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestGeneralSettingsContainer(): TestGeneralSettingsContainer {
  return {
    generalSettingsConfigurator: new InMemoryGeneralSettingsConfigurator(),
    generalSettingsStorage: new InMemoryGeneralSettingsStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestGeneralSettingsContainer(): () => TestGeneralSettingsContainer {
  let container: TestGeneralSettingsContainer;

  beforeEach(() => {
    container = createTestGeneralSettingsContainer();
  });

  return () => container;
}

// Report test helpers

export class InMemoryReportConfigurator implements ReportConfigurator {
  private reports: Record<string, ReportConfig> = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    reports: Readonly<Record<string, ReportConfig>>;
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

  async getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }> {
    this.callLog.push("getReports");
    this.checkFail("getReports");
    return { reports: { ...this.reports }, revision: this.revision };
  }

  async updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateReports");
    this.checkFail("updateReports");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setReports(reports: Record<string, ReportConfig>, revision?: string): void {
    this.reports = { ...reports };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryReportStorage implements ReportStorage {
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

export type TestReportContainer = ReportContainer & {
  reportConfigurator: InMemoryReportConfigurator;
  reportStorage: InMemoryReportStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestReportContainer(): TestReportContainer {
  return {
    reportConfigurator: new InMemoryReportConfigurator(),
    reportStorage: new InMemoryReportStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestReportContainer(): () => TestReportContainer {
  let container: TestReportContainer;

  beforeEach(() => {
    container = createTestReportContainer();
  });

  return () => container;
}

// Notification test helpers

export class InMemoryNotificationConfigurator
  implements NotificationConfigurator
{
  private generalNotifications: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  } = {
    notifyToCommenter: false,
    notifications: [],
    revision: "1",
  };
  private perRecordNotifications: {
    notifications: readonly PerRecordNotification[];
    revision: string;
  } = {
    notifications: [],
    revision: "1",
  };
  private reminderNotifications: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  } = {
    timezone: "Asia/Tokyo",
    notifications: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateGeneralParams: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  } | null = null;
  lastUpdatePerRecordParams: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  } | null = null;
  lastUpdateReminderParams: {
    timezone: string;
    notifications: readonly ReminderNotification[];
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

  async getGeneralNotifications(): Promise<{
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }> {
    this.callLog.push("getGeneralNotifications");
    this.checkFail("getGeneralNotifications");
    return { ...this.generalNotifications };
  }

  async updateGeneralNotifications(params: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateGeneralNotifications");
    this.checkFail("updateGeneralNotifications");
    this.lastUpdateGeneralParams = params;
    const newRevision = String(Number(this.generalNotifications.revision) + 1);
    this.generalNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  async getPerRecordNotifications(): Promise<{
    notifications: readonly PerRecordNotification[];
    revision: string;
  }> {
    this.callLog.push("getPerRecordNotifications");
    this.checkFail("getPerRecordNotifications");
    return { ...this.perRecordNotifications };
  }

  async updatePerRecordNotifications(params: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updatePerRecordNotifications");
    this.checkFail("updatePerRecordNotifications");
    this.lastUpdatePerRecordParams = params;
    const newRevision = String(
      Number(this.perRecordNotifications.revision) + 1,
    );
    this.perRecordNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  async getReminderNotifications(): Promise<{
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }> {
    this.callLog.push("getReminderNotifications");
    this.checkFail("getReminderNotifications");
    return { ...this.reminderNotifications };
  }

  async updateReminderNotifications(params: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateReminderNotifications");
    this.checkFail("updateReminderNotifications");
    this.lastUpdateReminderParams = params;
    const newRevision = String(Number(this.reminderNotifications.revision) + 1);
    this.reminderNotifications.revision = newRevision;
    return { revision: newRevision };
  }

  setGeneralNotifications(data: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }): void {
    this.generalNotifications = data;
  }

  setPerRecordNotifications(data: {
    notifications: readonly PerRecordNotification[];
    revision: string;
  }): void {
    this.perRecordNotifications = data;
  }

  setReminderNotifications(data: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }): void {
    this.reminderNotifications = data;
  }
}

export class InMemoryNotificationStorage implements NotificationStorage {
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

export type TestNotificationContainer = NotificationContainer & {
  notificationConfigurator: InMemoryNotificationConfigurator;
  notificationStorage: InMemoryNotificationStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestNotificationContainer(): TestNotificationContainer {
  return {
    notificationConfigurator: new InMemoryNotificationConfigurator(),
    notificationStorage: new InMemoryNotificationStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestNotificationContainer(): () => TestNotificationContainer {
  let container: TestNotificationContainer;

  beforeEach(() => {
    container = createTestNotificationContainer();
  });

  return () => container;
}

// Action test helpers

export class InMemoryActionConfigurator implements ActionConfigurator {
  private actions: Record<string, ActionConfig> = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    actions: Readonly<Record<string, ActionConfig>>;
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

  async getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }> {
    this.callLog.push("getActions");
    this.checkFail("getActions");
    return { actions: { ...this.actions }, revision: this.revision };
  }

  async updateActions(params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateActions");
    this.checkFail("updateActions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setActions(actions: Record<string, ActionConfig>, revision?: string): void {
    this.actions = { ...actions };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryActionStorage implements ActionStorage {
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

export type TestActionContainer = ActionContainer & {
  actionConfigurator: InMemoryActionConfigurator;
  actionStorage: InMemoryActionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestActionContainer(): TestActionContainer {
  return {
    actionConfigurator: new InMemoryActionConfigurator(),
    actionStorage: new InMemoryActionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestActionContainer(): () => TestActionContainer {
  let container: TestActionContainer;

  beforeEach(() => {
    container = createTestActionContainer();
  });

  return () => container;
}

// Admin notes test helpers

export class InMemoryAdminNotesConfigurator implements AdminNotesConfigurator {
  private config: AdminNotesConfig = {
    content: "",
    includeInTemplateAndDuplicates: false,
  };
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: AdminNotesConfig;
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

  async getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    revision: string;
  }> {
    this.callLog.push("getAdminNotes");
    this.checkFail("getAdminNotes");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateAdminNotes(params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateAdminNotes");
    this.checkFail("updateAdminNotes");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: AdminNotesConfig, revision?: string): void {
    this.config = { ...config };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryAdminNotesStorage implements AdminNotesStorage {
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

export type TestAdminNotesContainer = AdminNotesContainer & {
  adminNotesConfigurator: InMemoryAdminNotesConfigurator;
  adminNotesStorage: InMemoryAdminNotesStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAdminNotesContainer(): TestAdminNotesContainer {
  return {
    adminNotesConfigurator: new InMemoryAdminNotesConfigurator(),
    adminNotesStorage: new InMemoryAdminNotesStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAdminNotesContainer(): () => TestAdminNotesContainer {
  let container: TestAdminNotesContainer;

  beforeEach(() => {
    container = createTestAdminNotesContainer();
  });

  return () => container;
}

// Plugin test helpers

export class InMemoryPluginConfigurator implements PluginConfigurator {
  private plugins: readonly PluginConfig[] = [];
  private revision = "1";
  callLog: string[] = [];
  lastAddPluginsParams: { ids: readonly string[]; revision?: string } | null =
    null;
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

  async getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }> {
    this.callLog.push("getPlugins");
    this.checkFail("getPlugins");
    return { plugins: [...this.plugins], revision: this.revision };
  }

  async addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("addPlugins");
    this.checkFail("addPlugins");
    this.lastAddPluginsParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setPlugins(plugins: readonly PluginConfig[], revision?: string): void {
    this.plugins = [...plugins];
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryPluginStorage implements PluginStorage {
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

export type TestPluginContainer = PluginContainer & {
  pluginConfigurator: InMemoryPluginConfigurator;
  pluginStorage: InMemoryPluginStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestPluginContainer(): TestPluginContainer {
  return {
    pluginConfigurator: new InMemoryPluginConfigurator(),
    pluginStorage: new InMemoryPluginStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestPluginContainer(): () => TestPluginContainer {
  let container: TestPluginContainer;

  beforeEach(() => {
    container = createTestPluginContainer();
  });

  return () => container;
}
