import { define } from "gunshi";
import applyCommand from "./apply";
import captureCommand from "./capture";
import pushCommand from "./push";

// `pull` is intentionally not added: seed is out of scope for 3-way merge, so it
// has no `seed pull` counterpart to `seed push`. `seed capture` stays as-is.
// `apply` remains as a deprecation alias for `push`.
export default define({
  name: "seed",
  description: "Manage kintone seed data (records)",
  subCommands: {
    push: pushCommand,
    apply: applyCommand,
    capture: captureCommand,
  },
  run: () => {},
});
