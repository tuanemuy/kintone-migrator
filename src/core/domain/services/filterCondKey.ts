import { formatValue } from "./formatValue";

/**
 * Merge key of the `index`-th entry among the entries sharing `filterCond`
 * (record permission rights, perRecord notifications). The index suffix comes
 * after the full filterCond, so the last `#` always starts the index even when
 * the filterCond itself contains `#`.
 */
export function filterCondKey(filterCond: string, index: number): string {
  return `${filterCond}#${index}`;
}

/**
 * Display form of a {@link filterCondKey}: the filterCond quoted as a value,
 * then the index (`"status = \"A\""#0`). Quoting keeps a `]`, `#`, `"` or
 * newline in the filterCond from blurring where the key ends.
 */
export function describeFilterCondKey(key: string): string {
  const indexStart = key.lastIndexOf("#");
  return `${formatValue(key.slice(0, indexStart))}${key.slice(indexStart)}`;
}
