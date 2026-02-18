import type {
  AppEntry,
  AppExecutionResult,
  ExecutionPlan,
  MultiAppResult,
} from "@/core/domain/projectConfig/entity";
import { MultiAppResult as MultiAppResultFactory } from "@/core/domain/projectConfig/entity";

export type MultiAppExecutor = (app: AppEntry) => Promise<void>;

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

    try {
      await executor(app);
      results.push({ name: app.name, status: "succeeded" });
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
