import { describe, expect, it } from "vitest";
import { createKintoneBackedFormSchemaContainer } from "@/core/application/__tests__/helpers";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { pullSchema } from "../pullSchema";

type RelatedApp = { app: string; code?: string };

function createContainer(remoteRelatedApp: RelatedApp) {
  return createKintoneBackedFormSchemaContainer({
    properties: {
      company: {
        type: "SINGLE_LINE_TEXT",
        code: "company",
        label: "企業名",
        noLabel: false,
      },
      members: {
        type: "REFERENCE_TABLE",
        code: "members",
        label: "関連担当者情報",
        noLabel: false,
        referenceTable: {
          relatedApp: remoteRelatedApp,
          condition: { field: "company", relatedField: "company_name" },
          filterCond: "",
          displayFields: ["member_name", "email"],
          sort: "レコード番号 desc",
          size: "5",
        },
      },
    },
    layout: [
      {
        type: "ROW",
        fields: [
          { type: "SINGLE_LINE_TEXT", code: "company" },
          { type: "REFERENCE_TABLE", code: "members" },
        ],
      },
    ],
  });
}

function schemaWithRelatedApp(relatedApp: string): string {
  return `layout:
  - type: ROW
    fields:
      - code: company
        type: SINGLE_LINE_TEXT
        label: 企業名
        noLabel: false
      - code: members
        type: REFERENCE_TABLE
        label: 関連担当者情報
        noLabel: false
        referenceTable:
          relatedApp: ${relatedApp}
          condition:
            field: company
            relatedField: company_name
          filterCond: ""
          displayFields:
            - member_name
            - email
          sort: レコード番号 desc
          size: "5"
`;
}

describe("REFERENCE_TABLE の relatedApp を含むフォームの capture / diff / migrate", () => {
  describe.each<RelatedApp>([
    { app: "21", code: "" },
    { app: "21", code: "MEMBERS" },
    { app: "21" },
  ])("API が relatedApp を %o で返すとき", (relatedApp) => {
    it("capture 直後の diff は差分なし", async () => {
      const { container } = createContainer(relatedApp);

      const { schemaText } = await captureSchema({ container });
      await container.schemaStorage.update(schemaText);
      const result = await detectDiff({ container });

      expect(result.entries).toEqual([]);
      expect(result.hasLayoutChanges).toBe(false);
      expect(result.isEmpty).toBe(true);
    });

    it("capture 直後の migrate は何も送らない", async () => {
      const { container, client } = createContainer(relatedApp);

      const { schemaText } = await captureSchema({ container });
      await container.schemaStorage.update(schemaText);
      await executeMigration({ container });

      expect(client.app.addFormFields).not.toHaveBeenCalled();
      expect(client.app.updateFormFields).not.toHaveBeenCalled();
      expect(client.app.deleteFormFields).not.toHaveBeenCalled();
      expect(client.app.updateFormLayout).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["code を省いた手書きの YAML", '{ app: "21" }'],
    ["code: '' を含む旧版 capture の YAML", '{ app: "21", code: "" }'],
    [
      "アプリコードを含む旧版 capture の YAML",
      '{ app: "21", code: "MEMBERS" }',
    ],
    ["API と code だけが違う YAML", '{ app: "21", code: "OTHER" }'],
  ])("%s は、app が一致するリモートと差分なし", async (_, relatedApp) => {
    const { container } = createContainer({ app: "21", code: "MEMBERS" });
    await container.schemaStorage.update(schemaWithRelatedApp(relatedApp));

    const result = await detectDiff({ container });

    expect(result.entries).toEqual([]);
    expect(result.hasLayoutChanges).toBe(false);
    expect(result.isEmpty).toBe(true);
  });

  it("YAML とリモートで relatedApp.app が異なるとき、relatedApp の変更として検出する", async () => {
    const { container } = createContainer({ app: "22", code: "" });
    await container.schemaStorage.update(schemaWithRelatedApp('{ app: "21" }'));

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(false);
    expect(result.hasLayoutChanges).toBe(true);
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry).toMatchObject({
      type: "modified",
      fieldCode: "members",
      before: { properties: { referenceTable: { relatedApp: { app: "22" } } } },
      after: { properties: { referenceTable: { relatedApp: { app: "21" } } } },
    });
    expect(entry?.details).toMatch(/^referenceTable\.relatedApp: /);
    expect(entry?.details).not.toContain("\nreferenceTable.");
  });

  it("YAML とリモートで relatedApp.app が異なるとき、migrate は YAML の app で更新を送る", async () => {
    const { container, client } = createContainer({ app: "22", code: "" });
    await container.schemaStorage.update(
      schemaWithRelatedApp('{ app: "21", code: "MEMBERS" }'),
    );

    await executeMigration({ container });

    expect(client.app.updateFormFields).toHaveBeenCalledTimes(1);
    expect(client.app.updateFormFields).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          members: expect.objectContaining({
            referenceTable: expect.objectContaining({
              relatedApp: { app: "21" },
            }),
          }),
        },
      }),
    );
  });
});

describe("REFERENCE_TABLE の relatedApp を含むフォームの 3-way diff", () => {
  it("pull で初期化した base / local とリモートは差分なし", async () => {
    const { container } = createContainer({ app: "21", code: "MEMBERS" });
    await pullSchema({ container, input: {} });

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

  it("旧版 pull が保存した code 入りの base / local とリモートは差分なし", async () => {
    const { container } = createContainer({ app: "21", code: "MEMBERS" });
    const legacy = schemaWithRelatedApp('{ app: "21", code: "MEMBERS" }');
    container.schemaStateStorage.setContent(legacy);
    container.schemaStorage.setContent(legacy);

    const result = await detectThreeWayDiff({ container });

    expect(result).toMatchObject({ mode: "three-way", isEmpty: true });
  });

  it("リモートだけ relatedApp.app が変わると remote drift として検出する", async () => {
    const { container } = createContainer({ app: "22", code: "" });
    const base = schemaWithRelatedApp('{ app: "21" }');
    container.schemaStateStorage.setContent(base);
    container.schemaStorage.setContent(base);

    const result = await detectThreeWayDiff({ container });

    expect(result).toMatchObject({
      mode: "three-way",
      localChanges: [],
      remoteDrift: [{ key: "members", kind: "remoteOnly" }],
      conflicts: [],
      isEmpty: false,
    });
  });

  it("local とリモートが別々の relatedApp.app に変わると conflict として検出する", async () => {
    const { container } = createContainer({ app: "22", code: "" });
    container.schemaStateStorage.setContent(
      schemaWithRelatedApp('{ app: "21" }'),
    );
    container.schemaStorage.setContent(schemaWithRelatedApp('{ app: "23" }'));

    const result = await detectThreeWayDiff({ container });

    expect(result).toMatchObject({
      mode: "three-way",
      localChanges: [],
      remoteDrift: [],
      conflicts: [{ key: "members", kind: "conflict" }],
      isEmpty: false,
    });
  });
});
