import type { FormReadTarget } from "@/core/domain/formSchema/ports/formReadTarget";
import { DEFAULT_FORM_READ_TARGET } from "@/core/domain/formSchema/ports/formReadTarget";
import type { DumpServiceArgs } from "../container/dump";

export type DumpFormInput = {
  /** Which form generation to dump. Defaults to `"preview"`. */
  readonly target?: FormReadTarget;
};

// `input` is optional (rather than the usual required DTO object) because
// dumping the preview is the default contract: callers that want it pass
// nothing.
export type DumpFormArgs = DumpServiceArgs & {
  input?: DumpFormInput;
};

export async function dumpForm({
  container,
  input,
}: DumpFormArgs): Promise<void> {
  const rawData = await container.formDumpReader.getRawFormData(
    input?.target ?? DEFAULT_FORM_READ_TARGET,
  );

  await Promise.all([
    container.dumpStorage.saveFields(JSON.stringify(rawData.fields, null, 2)),
    container.dumpStorage.saveLayout(JSON.stringify(rawData.layout, null, 2)),
  ]);
}
