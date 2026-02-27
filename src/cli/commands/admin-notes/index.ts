import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import diffCommand from "./diff";

export default define({
  name: "admin-notes",
  description: "Manage kintone admin notes",
  subCommands: {
    apply: applyCommand,
    capture: captureCommand,
    diff: diffCommand,
  },
  run: () => {},
});
