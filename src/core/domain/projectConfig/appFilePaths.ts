import { join } from "node:path";
import type { AppName } from "./valueObject";

export type AppFilePaths = {
  readonly schema: string;
  readonly seed: string;
  readonly customize: string;
  readonly view: string;
  readonly settings: string;
  readonly notification: string;
  readonly report: string;
  readonly action: string;
  readonly process: string;
  readonly fieldAcl: string;
  readonly appAcl: string;
  readonly recordAcl: string;
  readonly adminNotes: string;
  readonly plugin: string;
};

export function buildAppFilePaths(
  appName: AppName,
  baseDir?: string,
): AppFilePaths {
  const prefix = (path: string): string =>
    baseDir ? join(baseDir, path) : path;
  return {
    schema: prefix(`schemas/${appName}.yaml`),
    seed: prefix(`seeds/${appName}.yaml`),
    customize: prefix(`customize/${appName}.yaml`),
    view: prefix(`view/${appName}.yaml`),
    settings: prefix(`settings/${appName}.yaml`),
    notification: prefix(`notification/${appName}.yaml`),
    report: prefix(`report/${appName}.yaml`),
    action: prefix(`action/${appName}.yaml`),
    process: prefix(`process/${appName}.yaml`),
    fieldAcl: prefix(`field-acl/${appName}.yaml`),
    appAcl: prefix(`app-acl/${appName}.yaml`),
    recordAcl: prefix(`record-acl/${appName}.yaml`),
    adminNotes: prefix(`admin-notes/${appName}.yaml`),
    plugin: prefix(`plugin/${appName}.yaml`),
  };
}
