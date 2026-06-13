import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import type { TestFormSchemaContainer } from "@/core/application/__tests__/helpers/formSchema";
import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { SchemaStateSerializer } from "@/core/domain/formSchema/services/schemaStateSerializer";
import {
  FieldCode,
  type FieldDefinition,
  type MergeResolution,
} from "@/core/domain/formSchema/valueObject";
import { applyPulledMerge, pullSchema } from "../pullSchema";

const getContainer = setupTestFormSchemaContainer();

function textField(code: string, label: string): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SINGLE_LINE_TEXT",
    label,
    properties: {},
  } as FieldDefinition;
}

function schemaYaml(label: string): string {
  return `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: ${label}
`;
}

function setRemote(
  container: TestFormSchemaContainer,
  label: string,
  revision = "1",
): void {
  const field = textField("name", label);
  container.formConfigurator.setFields(
    new Map([[FieldCode.create("name"), field]]),
  );
  container.formConfigurator.setLayout([
    { type: "ROW", fields: [{ kind: "field", field }] },
  ]);
  container.formConfigurator.setRevision(revision);
}

function setState(
  container: TestFormSchemaContainer,
  schema: Schema,
  revision: string,
): void {
  const data = SchemaStateSerializer.serialize({ schema });
  container.schemaStateStorage.setContent(configCodec.stringify(data));
  // revision is now persisted separately.
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

function parseSchema(label: string): Schema {
  return SchemaParser.parse(configCodec.parse(schemaYaml(label)));
}

function mutationCalls(container: TestFormSchemaContainer): string[] {
  return container.formConfigurator.callLog.filter(
    (c) =>
      c === "addFields" ||
      c === "updateFields" ||
      c === "deleteFields" ||
      c === "updateLayout",
  );
}

describe("pullSchema", () => {
  it("--force は remote で local を上書きし state を保存する（実環境に書かない）", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前_ローカル"));
    setRemote(container, "名前_リモート", "9");
    container.formConfigurator.resetCallLog();

    const result = await pullSchema({ container, input: { force: true } });

    expect(result.mode).toBe("force");
    const local = await container.schemaStorage.get();
    expect(local.exists && local.content.includes("名前_リモート")).toBe(true);
    const state = await container.schemaStateStorage.get();
    expect(state.exists).toBe(true);
    // No remote mutations.
    expect(mutationCalls(container)).toHaveLength(0);
  });

  it("初回（state なし）は remote→local 上書きし state を初期化する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前_ローカル"));
    setRemote(container, "名前_リモート", "3");

    const result = await pullSchema({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    const state = await container.schemaStateStorage.get();
    expect(state.exists).toBe(true);
  });

  it("state あり・conflict なしは自動マージして書き戻す", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "5");
    // local changed only
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前", "5"); // remote == base

    const result = await pullSchema({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(false);
    }
  });

  it("conflict がある場合は merge を返すだけで local/state を変更しない（AC-15）", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "5");
    container.schemaStorage.setContent(schemaYaml("名前_ローカル"));
    setRemote(container, "名前_リモート", "6"); // both diverged differently
    container.schemaStorage.resetCallLog();
    container.schemaStateStorage.resetCallLog();

    const result = await pullSchema({ container, input: {} });

    expect(result.mode).toBe("merged");
    if (result.mode === "merged") {
      expect(result.merge.hasConflict).toBe(true);
    }
    // Two-stage: nothing written until applyPulledMerge runs.
    expect(container.schemaStorage.callLog).not.toContain("update");
    expect(container.schemaStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledMerge で resolution を適用すると local と state が書かれる", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "5");
    container.schemaStorage.setContent(schemaYaml("名前_ローカル"));
    setRemote(container, "名前_リモート", "6");

    const result = await pullSchema({ container, input: {} });
    if (result.mode !== "merged") throw new Error("expected merged");

    const resolution: MergeResolution = {
      fields: new Map([[FieldCode.create("name"), "remote"]]),
      layout: "remote",
    };
    await applyPulledMerge({
      container,
      input: {
        merge: result.merge,
        resolution,
        remoteRevision: result.remoteRevision,
        remoteSchema: result.remoteSchema,
      },
    });

    const local = await container.schemaStorage.get();
    expect(local.exists && local.content.includes("名前_リモート")).toBe(true);
    const state = await container.schemaStateStorage.get();
    expect(state.exists).toBe(true);
    // Still no remote mutations.
    expect(mutationCalls(container)).toHaveLength(0);
  });
});
