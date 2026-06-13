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
} from "@/core/domain/formSchema/valueObject";
import { captureSchema } from "../captureSchema";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";

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
  const data = SchemaStateSerializer.serialize({ revision, schema });
  container.schemaStateStorage.setContent(configCodec.stringify(data));
}

function parseSchema(label: string): Schema {
  return SchemaParser.parse(configCodec.parse(schemaYaml(label)));
}

describe("detectThreeWayDiff", () => {
  it("state がない場合は 2-way にフォールバックする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前"));
    setRemote(container, "名前");

    const result = await detectThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("state があり local のみ変更なら localChanges に分類される", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "1");
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前", "1");

    const result = await detectThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.fieldCode)).toContain("name");
      expect(result.remoteDrift).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("remote のみ変更なら remoteDrift に分類される", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "1");
    container.schemaStorage.setContent(schemaYaml("名前"));
    setRemote(container, "名前_リモート", "2");

    const result = await detectThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.fieldCode)).toContain("name");
    }
  });

  it("両側が別々に変更すると conflict に分類される", async () => {
    const container = getContainer();
    const base = parseSchema("名前");
    setState(container, base, "1");
    container.schemaStorage.setContent(schemaYaml("名前_ローカル"));
    setRemote(container, "名前_リモート", "2");

    const result = await detectThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.fieldCode)).toContain("name");
    }
  });
});

describe("legacy commands do not touch state storage (arch-r2-S003)", () => {
  it("executeMigration は schemaStateStorage を読み書きしない", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(schemaYaml("名前_新"));
    setRemote(container, "名前_旧", "1");
    container.schemaStateStorage.resetCallLog();

    await executeMigration({ container });

    expect(container.schemaStateStorage.callLog).toEqual([]);
  });

  it("captureSchema は schemaStateStorage を読み書きしない", async () => {
    const container = getContainer();
    setRemote(container, "名前", "1");
    container.schemaStateStorage.resetCallLog();

    await captureSchema({ container });

    expect(container.schemaStateStorage.callLog).toEqual([]);
  });
});
