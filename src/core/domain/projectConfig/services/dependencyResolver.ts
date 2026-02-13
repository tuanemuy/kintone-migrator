import { BusinessRuleError } from "@/core/domain/error";
import type { AppEntry, ExecutionPlan } from "../entity";
import { ProjectConfigErrorCode } from "../errorCode";
import type { AppName } from "../valueObject";

/**
 * Resolves execution order using Kahn's algorithm (BFS topological sort).
 * Apps at the same dependency level are sorted alphabetically for deterministic ordering.
 */
export function resolveExecutionOrder(
  apps: ReadonlyMap<AppName, AppEntry>,
): ExecutionPlan {
  validateDependencyReferences(apps);

  const inDegree = new Map<AppName, number>();
  const dependents = new Map<AppName, AppName[]>();

  for (const [name] of apps) {
    inDegree.set(name, 0);
    dependents.set(name, []);
  }

  for (const [name, entry] of apps) {
    for (const dep of entry.dependsOn) {
      inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      dependents.get(dep)?.push(name);
    }
  }

  // Start with nodes that have no dependencies, sorted alphabetically
  const queue: AppName[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }
  queue.sort();

  const orderedNames: AppName[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    orderedNames.push(current);

    const nextBatch: AppName[] = [];
    for (const dependent of dependents.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        nextBatch.push(dependent);
      }
    }

    // Sort newly freed nodes alphabetically and append to queue
    // to maintain BFS level-based alphabetical ordering
    nextBatch.sort();
    queue.push(...nextBatch);
  }

  if (orderedNames.length !== apps.size) {
    const cycleNodes = [...apps.keys()].filter(
      (name) => !orderedNames.includes(name),
    );
    throw new BusinessRuleError(
      ProjectConfigErrorCode.CircularDependency,
      `Circular dependency detected among: ${cycleNodes.join(", ")}`,
    );
  }

  const orderedApps = orderedNames.flatMap((name) => {
    const app = apps.get(name);
    return app ? [app] : [];
  });

  return { orderedApps };
}

function validateDependencyReferences(
  apps: ReadonlyMap<AppName, AppEntry>,
): void {
  for (const [name, entry] of apps) {
    for (const dep of entry.dependsOn) {
      if (!apps.has(dep)) {
        throw new BusinessRuleError(
          ProjectConfigErrorCode.UnknownDependency,
          `App "${name}" depends on unknown app "${dep}"`,
        );
      }
    }
  }
}
