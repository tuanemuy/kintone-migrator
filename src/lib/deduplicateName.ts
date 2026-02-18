const DEFAULT_MAX_COUNTER = 10_000;

/**
 * Generate a unique name by appending a counter suffix if the base name is already taken.
 *
 * NOTE: This function mutates `usedNames` by adding the returned name to the set.
 * This is intentional to allow sequential calls to track used names efficiently.
 */
export function deduplicateName(
  baseName: string,
  usedNames: Set<string>,
  options: {
    separator: string;
    startCounter: number;
    maxCounter?: number;
  },
): string {
  if (baseName === "") {
    throw new Error("baseName must not be empty");
  }
  if (options.separator === "") {
    throw new Error("separator must not be empty");
  }
  if (options.startCounter < 1) {
    throw new Error("startCounter must be >= 1");
  }

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
      throw new Error(
        `Failed to deduplicate name "${baseName}": exceeded maximum counter (${max})`,
      );
    }
    candidate = `${baseName}${options.separator}${counter}`;
  }
  usedNames.add(candidate);
  return candidate;
}
