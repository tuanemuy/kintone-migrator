import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";

export default define({
  name: "admin-notes",
  description: "Manage kintone admin notes",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
