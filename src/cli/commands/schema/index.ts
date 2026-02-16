import { define } from "gunshi";
import captureCommand from "./capture";
import diffCommand from "./diff";
import dumpCommand from "./dump";
import migrateCommand from "./migrate";
import overrideCommand from "./override";
import validateCommand from "./validate";

export default define({
  name: "schema",
  description: "Manage kintone form schemas",
  subCommands: {
    diff: diffCommand,
    migrate: migrateCommand,
    override: overrideCommand,
    capture: captureCommand,
    validate: validateCommand,
    dump: dumpCommand,
  },
  run: () => {},
});
