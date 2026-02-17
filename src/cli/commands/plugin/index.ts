import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";

export default define({
  name: "plugin",
  description: "Manage kintone plugins",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
