import { define } from "gunshi";
import applyCommand from "./apply";

export default define({
  name: "customize",
  description: "Manage kintone JS/CSS customizations",
  subCommands: {
    apply: applyCommand,
  },
  run: () => {},
});
