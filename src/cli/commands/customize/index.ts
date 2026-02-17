import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";

export default define({
  name: "customize",
  description: "Manage kintone JS/CSS customizations",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
