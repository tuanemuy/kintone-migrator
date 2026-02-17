import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";

export default define({
  name: "report",
  description: "Manage kintone report settings",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
