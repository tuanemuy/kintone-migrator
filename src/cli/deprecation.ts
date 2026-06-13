import * as p from "@clack/prompts";
import pc from "picocolors";

/**
 * Prints a one-line deprecation warning steering users from a legacy command to
 * its pull/push successor. Emitted via `p.log.warn` (clack's default stdout
 * stream) like every other human-facing log in this CLI. It is a single human
 * note line: it does not change the exit code and does not pollute the
 * machine-readable data (saved config files, diff/JSON output).
 */
export function printDeprecationWarning(args: {
  oldCommand: string;
  replacement: string;
  note?: string;
}): void {
  const { oldCommand, replacement, note } = args;
  const prefix = pc.yellow("[deprecated]");
  const head = `${prefix} \`${oldCommand}\` is deprecated and will be removed in a future major version. Use \`${replacement}\` instead.`;
  p.log.warn(note ? `${head}\n${pc.dim(note)}` : head);
}
