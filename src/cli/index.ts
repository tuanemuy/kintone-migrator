#!/usr/bin/env node

import "dotenv/config";
import { createRequire } from "node:module";
import { cli, define } from "gunshi";
import captureCommand from "./commands/capture";
import diffCommand from "./commands/diff";
import dumpCommand from "./commands/dump";
import migrateCommand from "./commands/migrate";
import overrideCommand from "./commands/override";
import seedCommand from "./commands/seed";

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
    diff: diffCommand,
    migrate: migrateCommand,
    override: overrideCommand,
    capture: captureCommand,
    dump: dumpCommand,
    seed: seedCommand,
  },
});
