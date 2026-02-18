import type { DumpStorage } from "@/core/domain/formSchema/ports/dumpStorage";
import type { FormDumpReader } from "@/core/domain/formSchema/ports/formDumpReader";
import type { ServiceArgs } from "../types";

export type DumpContainer = {
  formDumpReader: FormDumpReader;
  dumpStorage: DumpStorage;
};

export type DumpServiceArgs<T = undefined> = ServiceArgs<DumpContainer, T>;
