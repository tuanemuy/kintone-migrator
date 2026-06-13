import type {
  AppEntry,
  AppExecutionResult,
  ExecutionPlan,
  MultiAppResult,
} from "@/core/domain/projectConfig/entity";
import { MultiAppResult as MultiAppResultFactory } from "@/core/domain/projectConfig/entity";

/**
 * Input DTO carrying the success/failure of a single app from an executor back
 * to `executeMultiApp`. This is a 2-value outcome (ok / not ok) that the
 * executor reports about itself; it is NOT the domain `AppExecutionResult`
 * (a 3-value `succeeded`/`failed`/`skipped` status that `executeMultiApp`
 * produces as output, where `skipped` is assigned by fail-fast and cannot be
 * expressed by an executor). See ADR-001.
 */
export type AppExecutionOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly error?: Error };

/**
 * Executor return value is `AppExecutionOutcome | void`. A `void` (undefined)
 * return is treated as success, preserving the legacy contract (throw = failure,
 * normal return = success) so existing executors keep working unchanged.
 */
// `void` in the union is the intentional backward-compatibility contract
// (void return = success) required for existing executors that return nothing.
// See ADR-001.
export type MultiAppExecutor = (
  app: AppEntry,
  // biome-ignore lint/suspicious/noConfusingVoidType: see note above.
) => Promise<AppExecutionOutcome | void>;

export async function executeMultiApp(
  plan: ExecutionPlan,
  executor: MultiAppExecutor,
): Promise<MultiAppResult> {
  const results: AppExecutionResult[] = [];
  let failed = false;

  for (const app of plan.orderedApps) {
    if (failed) {
      results.push({ name: app.name, status: "skipped" });
      continue;
    }

    // Intentional try-catch: multi-app orchestration must catch per-app errors
    // so that the result of each app is recorded and remaining apps are marked
    // as skipped rather than letting the error propagate and abort the loop.
    try {
      const outcome = await executor(app);
      // `void`/undefined return = success (backward compatibility); an explicit
      // `{ ok: false }` outcome is a failure even though no exception was thrown.
      if (outcome && outcome.ok === false) {
        results.push({
          name: app.name,
          status: "failed",
          error: outcome.error,
        });
        failed = true;
      } else {
        results.push({ name: app.name, status: "succeeded" });
      }
    } catch (error) {
      results.push({
        name: app.name,
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      });
      failed = true;
    }
  }

  return MultiAppResultFactory.create(results);
}
