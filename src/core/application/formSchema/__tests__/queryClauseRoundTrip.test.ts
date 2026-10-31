import { describe, expect, it } from "vitest";
import {
  createKintoneBackedFormSchemaContainer,
  expectNoFormMutation,
  schemaFieldIn,
} from "@/core/application/__tests__/helpers";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import { isRecord } from "@/lib/typeGuards";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { applyPulledMerge, pullSchema } from "../pullSchema";
import { pushSchema } from "../pushSchema";

type Clauses = { filterCond?: unknown; sort?: unknown };

type FieldKind = {
  readonly name: string;
  readonly fieldCode: string;
  /** The key under the field that holds `filterCond` and `sort`. */
  readonly clauseKey: "lookup" | "referenceTable";
  readonly remoteField: (
    clauses: Clauses,
    label?: string,
  ) => Record<string, unknown>;
  /** YAML lines of the field; `clauseLines` go inside the clause holder. */
  readonly schemaField: (clauseLines: string, label?: string) => string;
};

const lookupKind: FieldKind = {
  name: "lookup",
  fieldCode: "customer_code",
  clauseKey: "lookup",
  remoteField: (clauses, label = "顧客コード") => ({
    type: "SINGLE_LINE_TEXT",
    code: "customer_code",
    label,
    noLabel: false,
    lookup: {
      relatedApp: { app: "10", code: "" },
      relatedKeyField: "code",
      fieldMappings: [{ field: "customer_name", relatedField: "name" }],
      lookupPickerFields: ["code"],
      ...clauses,
    },
  }),
  schemaField: (
    clauseLines,
    label = "顧客コード",
  ) => `      - code: customer_code
        type: SINGLE_LINE_TEXT
        label: ${label}
        noLabel: false
        lookup:
          relatedApp: { app: "10" }
          relatedKeyField: code
          fieldMappings:
            - field: customer_name
              relatedField: name
          lookupPickerFields:
            - code
${clauseLines}`,
};

const referenceTableKind: FieldKind = {
  name: "REFERENCE_TABLE",
  fieldCode: "members",
  clauseKey: "referenceTable",
  remoteField: (clauses, label = "関連担当者情報") => ({
    type: "REFERENCE_TABLE",
    code: "members",
    label,
    noLabel: false,
    referenceTable: {
      relatedApp: { app: "21", code: "" },
      condition: { field: "customer_name", relatedField: "company_name" },
      displayFields: ["member_name"],
      size: "5",
      ...clauses,
    },
  }),
  schemaField: (clauseLines, label = "関連担当者情報") => `      - code: members
        type: REFERENCE_TABLE
        label: ${label}
        noLabel: false
        referenceTable:
          relatedApp: { app: "21" }
          condition:
            field: customer_name
            relatedField: company_name
          displayFields:
            - member_name
          size: "5"
${clauseLines}`,
};

const customerName = {
  type: "SINGLE_LINE_TEXT",
  code: "customer_name",
  label: "顧客名",
  noLabel: false,
};

function createContainer(kind: FieldKind, field?: Record<string, unknown>) {
  return createKintoneBackedFormSchemaContainer({
    properties: {
      customer_name: customerName,
      ...(field === undefined ? {} : { [kind.fieldCode]: field }),
    },
    layout: [
      {
        type: "ROW",
        fields: [
          { type: "SINGLE_LINE_TEXT", code: "customer_name" },
          ...(field === undefined
            ? []
            : [{ type: field.type, code: kind.fieldCode }]),
        ],
      },
    ],
  });
}

function schemaText(kind: FieldKind, clauseLines: string, label?: string) {
  return `layout:
  - type: ROW
    fields:
      - code: customer_name
        type: SINGLE_LINE_TEXT
        label: 顧客名
        noLabel: false
${kind.schemaField(clauseLines, label)}`;
}

const omitted = "";
const valueless = "          filterCond:\n          sort:\n";
const empty = '          filterCond: ""\n          sort: ""\n';
const unsetRemotes: readonly [string, Clauses][] = [
  ["空文字を返す API", { filterCond: "", sort: "" }],
  ["キーを返さない API", {}],
];
const setRemote = { filterCond: 'status in ("active")', sort: "code asc" };
const setClauses = `          filterCond: 'status in ("active")'\n          sort: code asc\n`;

const unsetSchemas: readonly [string, string][] = [
  ["キーを省いた YAML", omitted],
  ["値を書かない YAML", valueless],
  ['"" と書いた YAML', empty],
];

function clausesIn(sent: unknown, kind: FieldKind): Clauses | undefined {
  if (!isRecord(sent) || !isRecord(sent.properties)) return undefined;
  const field = sent.properties[kind.fieldCode];
  if (!isRecord(field)) return undefined;
  const holder = field[kind.clauseKey];
  if (!isRecord(holder)) return undefined;
  return { filterCond: holder.filterCond, sort: holder.sort };
}

function clausesInSchema(
  codec: ConfigCodec,
  text: string,
  kind: FieldKind,
): Clauses | undefined {
  const holder = schemaFieldIn(codec, text, kind.fieldCode)?.[kind.clauseKey];
  if (!isRecord(holder)) return undefined;
  return { filterCond: holder.filterCond, sort: holder.sort };
}

async function expectLocalAndStateClauses(
  container: ReturnType<typeof createContainer>["container"],
  kind: FieldKind,
  expected: Clauses,
) {
  const local = await container.schemaStorage.get();
  const state = await container.schemaStateStorage.get();
  expect(local.exists && state.exists).toBe(true);
  if (local.exists && state.exists) {
    expect(
      clausesInSchema(container.configCodec, local.content, kind),
    ).toStrictEqual(expected);
    expect(
      clausesInSchema(container.configCodec, state.content, kind),
    ).toStrictEqual(expected);
  }
}

const unsetClauses = { filterCond: "", sort: "" };

describe.each([
  lookupKind,
  referenceTableKind,
])("$name の filterCond・sort", (kind) => {
  describe.each(unsetRemotes)("%s", (_, remote) => {
    it.each(
      unsetSchemas,
    )("%s の diff は差分なし、migrate は何も送らない", async (_, clauses) => {
      const { container, client } = createContainer(
        kind,
        kind.remoteField(remote),
      );
      container.schemaStorage.setContent(schemaText(kind, clauses));

      const diff = await detectDiff({ container });
      await executeMigration({ container });

      expect(diff.entries).toEqual([]);
      expect(diff.hasLayoutChanges).toBe(false);
      expect(diff.isEmpty).toBe(true);
      expectNoFormMutation(client);
    });

    it("capture の YAML は空文字を書き、直後の diff は差分なし", async () => {
      const { container } = createContainer(kind, kind.remoteField(remote));

      const captured = await captureSchema({ container });
      container.schemaStorage.setContent(captured.schemaText);
      const diff = await detectDiff({ container });

      expect(
        clausesInSchema(container.configCodec, captured.schemaText, kind),
      ).toStrictEqual(unsetClauses);
      expect(diff.isEmpty).toBe(true);
    });

    it("初回の pull が書く YAML と state は空文字を持つ", async () => {
      const { container } = createContainer(kind, kind.remoteField(remote));

      await pullSchema({ container, input: {} });

      await expectLocalAndStateClauses(container, kind, unsetClauses);
    });
  });

  it("キーを省いた YAML と非空の値を返す API は差分になり、migrate は空文字を送る", async () => {
    const { container, client } = createContainer(
      kind,
      kind.remoteField(setRemote),
    );
    container.schemaStorage.setContent(schemaText(kind, omitted));

    const diff = await detectDiff({ container });
    await executeMigration({ container });

    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]).toMatchObject({
      type: "modified",
      fieldCode: kind.fieldCode,
    });
    expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
    expect(
      clausesIn(client.app.updateFormFields.mock.calls[0]?.[0], kind),
    ).toStrictEqual(unsetClauses);
  });

  it("YAML と API が同じ非空の値を持つとき、diff は差分なし", async () => {
    const { container } = createContainer(kind, kind.remoteField(setRemote));
    container.schemaStorage.setContent(schemaText(kind, setClauses));

    const diff = await detectDiff({ container });

    expect(diff.isEmpty).toBe(true);
  });

  it("キーを省いた YAML で追加するフィールドは、空文字を持って送られる", async () => {
    const { container, client } = createContainer(kind);
    container.schemaStorage.setContent(schemaText(kind, omitted));

    await executeMigration({ container });

    expect(client.app.addFormFields).toHaveBeenCalledTimes(1);
    expect(
      clausesIn(client.app.addFormFields.mock.calls[0]?.[0], kind),
    ).toStrictEqual(unsetClauses);
  });

  describe("3-way", () => {
    it("キーを省いた local、空文字の base、空文字を返すリモートは差分なし", async () => {
      const { container } = createContainer(
        kind,
        kind.remoteField(unsetClauses),
      );
      container.schemaStateStorage.setContent(schemaText(kind, empty));
      container.schemaStorage.setContent(schemaText(kind, omitted));

      const result = await detectThreeWayDiff({ container });

      expect(result).toEqual({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [],
        conflicts: [],
        extras: [],
        isEmpty: true,
      });
    });

    it("キーを省いた local、空文字の base、非空の値を返すリモートは remote drift", async () => {
      const { container } = createContainer(kind, kind.remoteField(setRemote));
      container.schemaStateStorage.setContent(schemaText(kind, empty));
      container.schemaStorage.setContent(schemaText(kind, omitted));

      const result = await detectThreeWayDiff({ container });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [],
        remoteDrift: [{ key: kind.fieldCode, kind: "remoteOnly" }],
        conflicts: [],
        isEmpty: false,
      });
    });

    it("キーを省いた local と、同じ非空の値の base・リモートは local change で、push は空文字を送る", async () => {
      const { container, client } = createContainer(
        kind,
        kind.remoteField(setRemote),
      );
      container.schemaStateStorage.setContent(schemaText(kind, setClauses));
      container.schemaStorage.setContent(schemaText(kind, omitted));

      const result = await detectThreeWayDiff({ container });
      await pushSchema({ container, input: {} });

      expect(result).toMatchObject({
        mode: "three-way",
        localChanges: [{ key: kind.fieldCode, kind: "localOnly" }],
        remoteDrift: [],
        conflicts: [],
        isEmpty: false,
      });
      expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
      expect(
        clausesIn(client.app.updateFormFields.mock.calls[0]?.[0], kind),
      ).toStrictEqual(unsetClauses);
    });

    it("キーを省いた local とリモートの変更をマージした pull の YAML と state は空文字を持つ", async () => {
      const { container } = createContainer(
        kind,
        kind.remoteField(unsetClauses, "新しいラベル"),
      );
      container.schemaStateStorage.setContent(schemaText(kind, empty));
      container.schemaStorage.setContent(schemaText(kind, omitted));

      const result = await pullSchema({ container, input: {} });
      expect(result.mode).toBe("merged");
      if (result.mode !== "merged") return;
      await applyPulledMerge({
        container,
        input: {
          merge: result.merge,
          resolution: { fields: new Map(), layout: "noConflict" },
          remoteRevision: result.remoteRevision,
          remoteSchema: result.remoteSchema,
        },
      });

      await expectLocalAndStateClauses(container, kind, unsetClauses);
    });
  });
});

describe("SUBTABLE 内の lookup の filterCond・sort", () => {
  const remoteSubtable = (clauses: Clauses) => ({
    type: "SUBTABLE",
    code: "items",
    label: "明細",
    fields: {
      item_customer: {
        type: "NUMBER",
        code: "item_customer",
        label: "顧客",
        noLabel: false,
        lookup: {
          relatedApp: { app: "10", code: "" },
          relatedKeyField: "code",
          fieldMappings: [],
          lookupPickerFields: [],
          ...clauses,
        },
      },
    },
  });
  const schema = `layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_customer
        type: NUMBER
        label: 顧客
        noLabel: false
        lookup:
          relatedApp: { app: "10" }
          relatedKeyField: code
`;

  describe.each(unsetRemotes)("%s", (_, clauses) => {
    it.each(
      unsetSchemas,
    )("%s の diff は差分なし、migrate は何も送らない", async (_, schemaClauses) => {
      const { container, client } = createKintoneBackedFormSchemaContainer({
        properties: { items: remoteSubtable(clauses) },
        layout: [
          {
            type: "SUBTABLE",
            code: "items",
            fields: [{ type: "NUMBER", code: "item_customer" }],
          },
        ],
      });
      container.schemaStorage.setContent(schema + schemaClauses);

      const diff = await detectDiff({ container });
      await executeMigration({ container });

      expect(diff.isEmpty).toBe(true);
      expectNoFormMutation(client);
    });
  });
});
