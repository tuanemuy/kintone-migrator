import { describe, expect, it } from "vitest";
import {
  createKintoneBackedFormSchemaContainer,
  expectNoFormMutation,
} from "@/core/application/__tests__/helpers";
import { captureSchema } from "../captureSchema";
import { detectDiff } from "../detectDiff";
import { detectThreeWayDiff } from "../detectThreeWayDiff";
import { executeMigration } from "../executeMigration";
import { pullSchema } from "../pullSchema";

type RelatedApp = { app?: string; code?: string };

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

      expectNoFormMutation(client);
    });
  });

  it.each<[string, string, RelatedApp, RelatedApp]>([
    ["ID 指定", '{ app: "21" }', { app: "22" }, { app: "21" }],
    [
      "コード指定",
      '{ code: "MEMBERS" }',
      { code: "STAFF" },
      { code: "MEMBERS" },
    ],
  ])("%s の YAML とリモートで参照先が異なるとき、relatedApp の変更として検出する", async (_, local, before, after) => {
    const { container } = createContainer({ app: "22", code: "STAFF" });
    await container.schemaStorage.update(schemaWithRelatedApp(local));

    const result = await detectDiff({ container });

    expect(result.isEmpty).toBe(false);
    expect(result.hasLayoutChanges).toBe(true);
    expect(result.entries).toHaveLength(1);
    const [entry] = result.entries;
    expect(entry).toMatchObject({
      type: "modified",
      fieldCode: "members",
      before: { properties: { referenceTable: { relatedApp: before } } },
      after: { properties: { referenceTable: { relatedApp: after } } },
    });
    expect(entry?.details).toMatch(/^referenceTable\.relatedApp: /);
    expect(entry?.details).not.toContain("\nreferenceTable.");
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
});
