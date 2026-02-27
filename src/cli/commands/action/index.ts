import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "action",
  description: "Manage kintone action settings",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  run: () => {},
});
