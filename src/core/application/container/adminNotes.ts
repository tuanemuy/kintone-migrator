import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type AdminNotesDiffContainer = {
  configCodec: ConfigCodec;
  adminNotesConfigurator: AdminNotesConfigurator;
  adminNotesStorage: AdminNotesStorage;
};

export type AdminNotesContainer = AdminNotesDiffContainer & {
  appDeployer: AppDeployer;
};

export type AdminNotesDiffServiceArgs<T = undefined> = ServiceArgs<
  AdminNotesDiffContainer,
  T
>;

export type AdminNotesServiceArgs<T = undefined> = ServiceArgs<
  AdminNotesContainer,
  T
>;
