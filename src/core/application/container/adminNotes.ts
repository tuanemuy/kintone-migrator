import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type AdminNotesContainer = {
  adminNotesConfigurator: AdminNotesConfigurator;
  adminNotesStorage: AdminNotesStorage;
  appDeployer: AppDeployer;
};

export type AdminNotesServiceArgs<T = undefined> = ServiceArgs<
  AdminNotesContainer,
  T
>;
