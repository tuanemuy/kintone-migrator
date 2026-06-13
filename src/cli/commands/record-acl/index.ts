import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";
import pullCommand from "./pull";
import pushCommand from "./push";

export default define({
  name: "record-acl",
  description: "Manage kintone record access permissions",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
    pull: pullCommand,
    push: pushCommand,
  },
  run: () => {},
});
