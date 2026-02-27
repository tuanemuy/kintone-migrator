import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "app-acl",
  description: "Manage kintone app access permissions",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  run: () => {},
});
