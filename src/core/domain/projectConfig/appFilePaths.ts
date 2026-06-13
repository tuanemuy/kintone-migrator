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
    schema: prefix(`${appName}/schema.yaml`),
    seed: prefix(`${appName}/seed.yaml`),
    customize: prefix(`${appName}/customize.yaml`),
    view: prefix(`${appName}/view.yaml`),
    settings: prefix(`${appName}/settings.yaml`),
    notification: prefix(`${appName}/notification.yaml`),
    report: prefix(`${appName}/report.yaml`),
    action: prefix(`${appName}/action.yaml`),
    process: prefix(`${appName}/process.yaml`),
    fieldAcl: prefix(`${appName}/field-acl.yaml`),
    appAcl: prefix(`${appName}/app-acl.yaml`),
    recordAcl: prefix(`${appName}/record-acl.yaml`),
    adminNotes: prefix(`${appName}/admin-notes.yaml`),
    plugin: prefix(`${appName}/plugin.yaml`),
  };
}

/**
 * Resolves the path to the schema state (base snapshot) file.
 *
 * State uses an app-scoped directory layout (`state/<appName>/schema.yaml`)
 * whose hierarchy is the inverse of {@link buildAppFilePaths} (`<appName>/...`).
 * They are intentionally kept as separate functions: the state convention is
 * chosen so that future per-app revision unification (e.g.
 * `state/<appName>/revision.yaml`) can live alongside without churn.
 */
export function buildStateFilePath(appName: AppName, baseDir?: string): string {
  const path = `state/${appName}/schema.yaml`;
  return baseDir ? join(baseDir, path) : path;
}

/**
 * Resolves the path to the legacy single-app schema state file
 * (`state/schema.yaml`).
 */
export function buildLegacyStateFilePath(baseDir?: string): string {
  const path = "state/schema.yaml";
  return baseDir ? join(baseDir, path) : path;
}
