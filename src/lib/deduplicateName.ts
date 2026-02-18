import { SystemError, SystemErrorCode } from "@/core/application/error";

const DEFAULT_MAX_COUNTER = 10_000;

export function deduplicateName(
  baseName: string,
  usedNames: Set<string>,
  options: {
    separator: string;
    startCounter: number;
    maxCounter?: number;
  },
): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const max = options.maxCounter ?? DEFAULT_MAX_COUNTER;
  let counter = options.startCounter;
  let candidate = `${baseName}${options.separator}${counter}`;
  while (usedNames.has(candidate)) {
    counter++;
    if (counter > max) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to deduplicate name "${baseName}": exceeded maximum counter (${max})`,
      );
    }
    candidate = `${baseName}${options.separator}${counter}`;
  }
  usedNames.add(candidate);
  return candidate;
}
