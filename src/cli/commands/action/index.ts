import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";

export default define({
  name: "action",
  description: "Manage kintone action settings",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
