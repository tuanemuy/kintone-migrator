export function formatValue(v: unknown): string {
  if (v === undefined) return "(none)";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  return JSON.stringify(v, null, 2);
}
