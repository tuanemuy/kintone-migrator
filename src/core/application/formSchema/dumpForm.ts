import type { DumpServiceArgs } from "../container/dump";

export async function dumpForm({ container }: DumpServiceArgs): Promise<void> {
  const rawData = await container.formDumpReader.getRawFormData();

  await Promise.all([
    container.dumpStorage.saveFields(JSON.stringify(rawData.fields, null, 2)),
    container.dumpStorage.saveLayout(JSON.stringify(rawData.layout, null, 2)),
  ]);
}
