import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "customize",
  description: "Manage kintone JS/CSS customizations",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  // gunshi requires a run function; subCommands handle the actual logic.
  run: () => {},
});
