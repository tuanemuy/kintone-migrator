#!/usr/bin/env node

import "dotenv/config";
import { createRequire } from "node:module";
import { cli, define } from "gunshi";
import customizeGroup from "./commands/customize";
import fieldAclGroup from "./commands/field-acl";
import schemaGroup from "./commands/schema";
import seedGroup from "./commands/seed";

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
  },
});
