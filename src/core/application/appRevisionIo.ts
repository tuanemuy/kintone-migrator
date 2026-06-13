import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import { AppRevisionParser } from "@/core/domain/appRevision/services/appRevisionParser";
import { AppRevisionSerializer } from "@/core/domain/appRevision/services/appRevisionSerializer";
import type { AppRevision } from "@/core/domain/appRevision/valueObject";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { wrapBusinessRuleError } from "./error";
import { parseConfigText } from "./parseConfigText";
import { stringifyConfig } from "./stringifyConfig";

/**
 * Loads and parses the locally saved base app revision, or returns undefined
 * when none exists yet (first run).
 */
export async function loadAppRevision(
  storage: AppRevisionStorage,
  codec: ConfigCodec,
): Promise<AppRevision | undefined> {
  const result = await storage.get();
  if (!result.exists) {
    return undefined;
  }
  const parsed = parseConfigText(codec, result.content, "App revision");
  return wrapBusinessRuleError(() => AppRevisionParser.parse(parsed));
}

/** Serializes and persists the base app revision via the codec port. */
export async function saveAppRevision(
  storage: AppRevisionStorage,
  codec: ConfigCodec,
  revision: string,
): Promise<void> {
  const data = AppRevisionSerializer.serialize({ revision });
  const text = stringifyConfig(codec, data);
  await storage.update(text);
}
