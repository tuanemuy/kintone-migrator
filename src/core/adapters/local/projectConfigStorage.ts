import { access } from "node:fs/promises";

export async function projectConfigExists(
  configPath: string,
): Promise<boolean> {
  try {
    await access(configPath);
    return true;
  } catch {
    return false;
  }
}
