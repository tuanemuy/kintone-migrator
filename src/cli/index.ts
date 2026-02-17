#!/usr/bin/env node

import "dotenv/config";
import { createRequire } from "node:module";
import { cli, define } from "gunshi";
import actionGroup from "./commands/action";
import adminNotesGroup from "./commands/admin-notes";
import appAclGroup from "./commands/app-acl";
import customizeGroup from "./commands/customize";
import fieldAclGroup from "./commands/field-acl";
import notificationGroup from "./commands/notification";
import pluginGroup from "./commands/plugin";
import processGroup from "./commands/process";
import recordAclGroup from "./commands/record-acl";
import reportGroup from "./commands/report";
import schemaGroup from "./commands/schema";
import seedGroup from "./commands/seed";
import settingsGroup from "./commands/settings";
import viewGroup from "./commands/view";

function loadVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    return (require("../package.json") as { version: string }).version;
  } catch {
    return "0.0.0-dev";
  }
}

const main = define({
  name: "kintone-migrator",
  description: "kintone form schema migration tool",
  run: () => {
    // デフォルトはヘルプ表示（gunshiが自動処理）
  },
});

await cli(process.argv.slice(2), main, {
  name: "kintone-migrator",
  version: loadVersion(),
  subCommands: {
    schema: schemaGroup,
    seed: seedGroup,
    customize: customizeGroup,
    "field-acl": fieldAclGroup,
    view: viewGroup,
    "app-acl": appAclGroup,
    "record-acl": recordAclGroup,
    process: processGroup,
    settings: settingsGroup,
    notification: notificationGroup,
    report: reportGroup,
    action: actionGroup,
    "admin-notes": adminNotesGroup,
    plugin: pluginGroup,
  },
});
