import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";

export class EmptyPluginStorage implements PluginStorage {
  async get(): Promise<{ content: string; exists: boolean }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyPluginStorage.get not implemented",
    );
  }

  async update(_content: string): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyPluginStorage.update not implemented",
    );
  }
}
