import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import type { TestFormSchemaContainer } from "@/core/application/__tests__/helpers/formSchema";
import { ConflictError, ValidationError } from "@/core/application/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { SchemaStateSerializer } from "@/core/domain/formSchema/services/schemaStateSerializer";
import {
  FieldCode,
  type FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { PUSH_DRIFT_MESSAGE, pushSchema } from "../pushSchema";

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
): FieldDefinition {
  const field = textField("name", label);
  container.formConfigurator.setFields(
    new Map([[FieldCode.create("name"), field]]),
  );
  container.formConfigurator.setLayout([
    { type: "ROW", fields: [{ kind: "field", field }] },
  ]);
  container.formConfigurator.setRevision(revision);
  return field;
}

function setState(
  container: TestFormSchemaContainer,
  schema: Schema,
  revision: string,
): void {
  const data = SchemaStateSerializer.serialize({ revision, schema });
  container.schemaStateStorage.setContent(configCodec.stringify(data));
}

function parseSchema(label: string): Schema {
  return SchemaParser.parse(configCodec.parse(schemaYaml(label)));
}

describe("pushSchema", () => {
  it("初回（state なし）は drift ガードなしで適用し state を初期化する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前_旧", "5");

    const result = await pushSchema({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    const fields = await container.formConfigurator.getFields();
    expect(fields.get(FieldCode.create("name"))?.label).toBe("名前_新");
    const state = await container.schemaStateStorage.get();
    expect(state.exists).toBe(true);
  });

  it("初回も期待 revision を送らない（検証スキップ）", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前_旧", "5");

    await pushSchema({ container, input: {} });

    // expectedRevision must be undefined for firstTime (revision-skip).
    expect(container.formConfigurator.expectedRevisions.length).toBeGreaterThan(
      0,
    );
    expect(
      container.formConfigurator.expectedRevisions.every(
        (r) => r === undefined,
      ),
    ).toBe(true);
  });

  it("drift がなければ適用し、観測した現在 revision を期待 revision として固定送出する", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "7");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前", "7"); // remote == base => no drift

    await pushSchema({ container, input: {} });

    const fields = await container.formConfigurator.getFields();
    expect(fields.get(FieldCode.create("name"))?.label).toBe("名前_新");
    // expected revision fixed to the observed current revision "7" on every
    // mutation (does not advance even if multiple APIs are called).
    expect(container.formConfigurator.expectedRevisions.length).toBeGreaterThan(
      0,
    );
    expect(
      container.formConfigurator.expectedRevisions.every((r) => r === "7"),
    ).toBe(true);
  });

  it("drift があり --force でない場合 ConflictError（push 専用メッセージ）", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "7");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    // remote diverged from base (label differs) => drift
    setRemote(container, "名前_リモート変更", "9");

    await expect(pushSchema({ container, input: {} })).rejects.toThrow(
      ConflictError,
    );
    await expect(pushSchema({ container, input: {} })).rejects.toThrow(
      PUSH_DRIFT_MESSAGE,
    );
  });

  it("旧 migrate 適用後（state 未更新）に push すると drift→ConflictError になる", async () => {
    const container = getContainer();
    // state base captured at "名前"
    const base = parseSchema("名前");
    setState(container, base, "3");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    // remote was changed out-of-band by a legacy migrate (state not updated)
    setRemote(container, "名前_別経路変更", "4");

    await expect(pushSchema({ container, input: {} })).rejects.toThrow(
      ConflictError,
    );
  });

  it("--force は drift をスキップし期待 revision を送らない", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "7");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前_リモート変更", "9"); // drift present

    const result = await pushSchema({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(
      container.formConfigurator.expectedRevisions.every(
        (r) => r === undefined,
      ),
    ).toBe(true);
  });

  it("型変更は ValidationError で弾かれる", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "1");
    container.schemaStorage.setContent(`
layout:
  - type: ROW
    fields:
      - code: name
        type: NUMBER
        label: 数値
`);
    setRemote(container, "名前", "1");

    await expect(pushSchema({ container, input: {} })).rejects.toThrow(
      ValidationError,
    );
  });

  it("local schema がない場合 ValidationError", async () => {
    const container = getContainer();
    setRemote(container, "名前", "1");

    await expect(pushSchema({ container, input: {} })).rejects.toThrow(
      ValidationError,
    );
  });

  it("適用後 getRevision で取得した preview revision を state に記録する", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "7");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前", "7");

    const result = await pushSchema({ container, input: {} });

    expect(result.revision).toBe("7");
  });
});
