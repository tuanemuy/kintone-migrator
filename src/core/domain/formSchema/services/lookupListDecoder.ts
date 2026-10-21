/**
 * Reads a lookup list (`fieldMappings`, `lookupPickerFields`) from an external
 * value. kintone represents an unset list as `""`, which reads as the empty
 * list. Returns `undefined` when the value is not a list.
 */
export function decodeLookupList(
  value: unknown,
): readonly unknown[] | undefined {
  if (value === "") return [];
  return Array.isArray(value) ? value : undefined;
}
