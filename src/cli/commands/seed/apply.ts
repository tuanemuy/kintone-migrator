import { define } from "gunshi";
import { printDeprecationWarning } from "../../deprecation";
import { runSeedPush, seedPushArgs } from "./push";

/**
 * Deprecation alias for `seed push`. Kept so existing `seed apply` scripts keep
 * working; emits a warning and delegates to the same upsert run.
 */
export default define({
  name: "apply",
  description:
    "Apply seed data (records) to kintone app (deprecated alias for 'seed push')",
  args: seedPushArgs,
  run: async (ctx) => {
    printDeprecationWarning({
      oldCommand: "seed apply",
      replacement: "seed push",
      note: "seed has no 3-way merge; behavior is plain upsert without drift guard.",
    });
    await runSeedPush(ctx);
  },
});
