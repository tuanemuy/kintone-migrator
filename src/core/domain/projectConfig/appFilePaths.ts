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

export function buildAppFilePaths(appName: string): AppFilePaths {
  return {
    schema: `schemas/${appName}.yaml`,
    seed: `seeds/${appName}.yaml`,
    customize: `customize/${appName}.yaml`,
    view: `view/${appName}.yaml`,
    settings: `settings/${appName}.yaml`,
    notification: `notification/${appName}.yaml`,
    report: `report/${appName}.yaml`,
    action: `action/${appName}.yaml`,
    process: `process/${appName}.yaml`,
    fieldAcl: `field-acl/${appName}.yaml`,
    appAcl: `app-acl/${appName}.yaml`,
    recordAcl: `record-acl/${appName}.yaml`,
    adminNotes: `admin-notes/${appName}.yaml`,
    plugin: `plugin/${appName}.yaml`,
  };
}
