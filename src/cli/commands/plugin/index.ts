import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "plugin",
  description: "Manage kintone plugins",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  run: () => {},
});
