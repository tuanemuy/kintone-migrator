import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";

/**
 * Shared `--published` flag for the schema commands that read a form definition
 * (`dump` / `diff`). Kept next to its users rather than in `src/cli/config.ts`,
 * which holds only domain-agnostic connection/execution-mode options.
 */
export const formReadTargetArgs = {
  published: {
    type: "boolean" as const,
    description:
      "Read the published (deployed) form instead of the preview (unpublished) one",
  },
};

export function resolveFormReadTarget(values: {
  published?: boolean;
}): FormReadTarget {
  return values.published ? "published" : "preview";
}
