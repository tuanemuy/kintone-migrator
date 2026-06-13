import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStateStorage } from "@/core/domain/adminNotes/ports/adminNotesStateStorage";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type AdminNotesDiffContainer = {
  configCodec: ConfigCodec;
  adminNotesConfigurator: AdminNotesConfigurator;
  adminNotesStorage: AdminNotesStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  adminNotesStateStorage: AdminNotesStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
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
