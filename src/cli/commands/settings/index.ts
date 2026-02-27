import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "settings",
  description: "Manage kintone general settings",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  run: () => {},
});
