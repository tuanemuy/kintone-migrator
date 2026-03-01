/** Returns true if the string contains any control characters (0x00–0x1f or 0x7f). */
export function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch <= 0x1f || ch === 0x7f) return true;
  }
  return false;
}

/** Replaces control characters (0x00–0x1f, 0x7f) with escaped `\\xNN` representation for safe display. */
export function sanitizeForDisplay(s: string): string {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch <= 0x1f || ch === 0x7f) {
      result += `\\x${ch.toString(16).padStart(2, "0")}`;
    } else {
      result += s[i];
    }
  }
  return result;
}
