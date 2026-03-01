import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type AdminNotesDiffContainer = {
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
