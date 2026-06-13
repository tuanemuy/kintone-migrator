import type {
  AppEntry,
  AppExecutionResult,
  ExecutionPlan,
  MultiAppResult,
} from "@/core/domain/projectConfig/entity";
import { MultiAppResult as MultiAppResultFactory } from "@/core/domain/projectConfig/entity";

/**
 * 2-value outcome (ok / not ok) an executor reports about a single app back to
 * `executeMultiApp`. Distinct from the domain `AppExecutionResult`, whose 3rd
 * status `skipped` is assigned by fail-fast and cannot be expressed by an
 * executor. See ADR-001.
 *
 * On `{ ok: false }`, `error` is the executor's responsibility — only it has the
 * context to describe the failure. When omitted, `AppExecutionResult.error` is
 * `undefined`; this use-case layer deliberately does NOT fabricate a fallback
 * `Error`. This is intentionally asymmetric with the throw path (which always
 * carries the caught real `Error`).
 */
export type AppExecutionOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly error?: Error };

/**
 * A `void` (undefined) return is treated as success, preserving the legacy
 * contract (throw = failure, normal return = success) so existing executors that
 * return nothing keep working unchanged. See ADR-001.
 */
export type MultiAppExecutor = (
  app: AppEntry,
  // biome-ignore lint/suspicious/noConfusingVoidType: void return = success, see type doc above.
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
      // An explicit `{ ok: false }` is a failure even though nothing was thrown;
      // `void`/undefined stays success (backward compatibility).
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
