import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";
import pullCommand from "./pull";
import pushCommand from "./push";

export default define({
  name: "notification",
  description: "Manage kintone notification settings",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
    pull: pullCommand,
    push: pushCommand,
  },
  run: () => {},
});
