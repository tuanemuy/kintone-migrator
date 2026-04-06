export function formatValue(v: unknown): string {
  return v === undefined ? "(none)" : JSON.stringify(v);
}
