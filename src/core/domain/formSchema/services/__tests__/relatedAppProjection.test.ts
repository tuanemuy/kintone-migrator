import { describe, expect, it } from "vitest";
import type {
  AnyRelatedApp,
  FieldCode,
  FieldDefinition,
  RelatedApp,
  RemoteRelatedApp,
} from "../../valueObject";
import {
  projectRemoteFields,
  restateBaseFields,
} from "../relatedAppProjection";

const code = (value: string) => value as FieldCode;

function lookupField<R extends AnyRelatedApp>(
  fieldCode: string,
  relatedApp: R,
): FieldDefinition<R> {
  return {
    code: code(fieldCode),
    type: "SINGLE_LINE_TEXT",
    label: fieldCode,
    properties: {
      required: false,
      lookup: {
        relatedApp,
        relatedKeyField: "key",
        fieldMappings: [],
        lookupPickerFields: [],
        filterCond: "",
        sort: "",
      },
    },
  };
}

function referenceTableField<R extends AnyRelatedApp>(
  fieldCode: string,
  relatedApp: R,
): FieldDefinition<R> {
  return {
    code: code(fieldCode),
    type: "REFERENCE_TABLE",
    label: fieldCode,
    properties: {
      referenceTable: {
        relatedApp,
        condition: { field: code("key"), relatedField: code("rKey") },
        filterCond: "",
        displayFields: [code("col1")],
        sort: "",
      },
    },
  };
}

// `never`: a field without a related app fits both a schema and a remote map.
const textField: FieldDefinition<never> = {
  code: code("text"),
  type: "SINGLE_LINE_TEXT",
  label: "text",
  properties: {},
};

function fieldsOf<R extends AnyRelatedApp>(
  ...fields: FieldDefinition<R>[]
): ReadonlyMap<FieldCode, FieldDefinition<R>> {
  return new Map(fields.map((field) => [field.code, field]));
}

/** A subtable `items` holding `inner`, with `inner` also at the top level. */
function withSubtable<R extends AnyRelatedApp>(
  inner: FieldDefinition<R>,
): ReadonlyMap<FieldCode, FieldDefinition<R>> {
  return fieldsOf<R>(
    {
      code: code("items"),
      type: "SUBTABLE",
      label: "items",
      properties: { fields: fieldsOf(inner) },
    },
    inner,
  );
}

const REMOTE: RemoteRelatedApp = { app: "10", code: "CUSTOMERS" };
const REMOTE_WITHOUT_CODE: RemoteRelatedApp = { app: "10", code: "" };
const BY_ID: RelatedApp = { app: "10" };
const BY_CODE: RelatedApp = { code: "CUSTOMERS" };

const holders = [
  ["lookup", lookupField],
  ["REFERENCE_TABLE", referenceTableField],
] as const;

describe("projectRemoteFields", () => {
  describe.each(holders)("%s", (_, holderField) => {
    it.each<[string, RemoteRelatedApp, RelatedApp | undefined, RelatedApp]>([
      ["参照スキーマが無い", REMOTE, undefined, BY_ID],
      ["参照スキーマが ID 指定", REMOTE, BY_ID, BY_ID],
      ["参照スキーマがコード指定", REMOTE, BY_CODE, { code: "CUSTOMERS" }],
      [
        "参照スキーマが別のコードで指定",
        REMOTE,
        { code: "OTHERS" },
        { code: "CUSTOMERS" },
      ],
      [
        "参照スキーマがコード指定でも、参照先にアプリコードが無い",
        REMOTE_WITHOUT_CODE,
        BY_CODE,
        BY_ID,
      ],
    ])("%sとき、リモートの %o を %o の指定方法で %o にする", (_, remote, reference, expected) => {
      const projected = projectRemoteFields(
        fieldsOf(holderField("f", remote)),
        reference === undefined
          ? undefined
          : fieldsOf(holderField("f", reference)),
      );

      expect(projected.get(code("f"))).toStrictEqual(
        holderField("f", expected),
      );
    });

    it("参照スキーマに同じフィールドコードのフィールドが無ければ ID 指定にする", () => {
      const projected = projectRemoteFields(
        fieldsOf(holderField("f", REMOTE)),
        fieldsOf(holderField("g", BY_CODE)),
      );

      expect(projected.get(code("f"))).toStrictEqual(holderField("f", BY_ID));
    });

    it("サブテーブルの中のフィールドも、サブテーブルの中とトップレベルの両方で射影する", () => {
      const projected = projectRemoteFields(
        withSubtable(holderField("f", REMOTE)),
        withSubtable(holderField("f", BY_CODE)),
      );

      expect(projected).toStrictEqual(
        withSubtable(holderField("f", { code: "CUSTOMERS" })),
      );
    });
  });

  it("参照スキーマの同じフィールドコードのフィールドの種類が違っても、その指定方法で射影する", () => {
    const projected = projectRemoteFields(
      fieldsOf(lookupField("f", REMOTE)),
      fieldsOf(referenceTableField("f", BY_CODE)),
    );

    expect(projected.get(code("f"))).toStrictEqual(
      lookupField("f", { code: "CUSTOMERS" }),
    );
  });

  it("参照スキーマの同じフィールドコードのフィールドが lookup を持たなければ ID 指定にする", () => {
    const projected = projectRemoteFields(
      fieldsOf(lookupField("text", REMOTE)),
      fieldsOf(textField),
    );

    expect(projected.get(code("text"))).toStrictEqual(
      lookupField("text", BY_ID),
    );
  });

  it("参照先を持たないフィールドはそのまま返す", () => {
    const projected = projectRemoteFields(fieldsOf(textField), undefined);

    expect(projected).toStrictEqual(fieldsOf(textField));
  });
});

describe("restateBaseFields", () => {
  describe.each(holders)("%s", (_, holderField) => {
    it.each<[string, RelatedApp, RelatedApp | undefined, RelatedApp]>([
      [
        "ID 指定の base を、コード指定のローカルに合わせる",
        BY_ID,
        BY_CODE,
        BY_CODE,
      ],
      [
        "コード指定の base を、ID 指定のローカルに合わせる",
        BY_CODE,
        BY_ID,
        BY_ID,
      ],
      [
        "コード指定の base を、ローカルが無ければ ID 指定にする",
        BY_CODE,
        undefined,
        BY_ID,
      ],
    ])("リモートと同じアプリを指すとき、%s", (_, base, local, expected) => {
      const restated = restateBaseFields(
        fieldsOf(holderField("f", base)),
        fieldsOf(holderField("f", REMOTE)),
        local === undefined ? undefined : fieldsOf(holderField("f", local)),
      );

      expect(restated.get(code("f"))).toStrictEqual(holderField("f", expected));
    });

    it.each<[string, RelatedApp]>([
      ["別のアプリ ID", { app: "11" }],
      ["別のアプリコード", { code: "OTHERS" }],
    ])("base がリモートと%sを指すときは、そのまま返す", (_, base) => {
      const restated = restateBaseFields(
        fieldsOf(holderField("f", base)),
        fieldsOf(holderField("f", REMOTE)),
        fieldsOf(holderField("f", BY_CODE)),
      );

      expect(restated.get(code("f"))).toStrictEqual(holderField("f", base));
    });

    it("リモートに同じフィールドコードのフィールドが無ければ、そのまま返す", () => {
      const restated = restateBaseFields(
        fieldsOf(holderField("f", BY_ID)),
        fieldsOf(holderField("g", REMOTE)),
        fieldsOf(holderField("f", BY_CODE)),
      );

      expect(restated.get(code("f"))).toStrictEqual(holderField("f", BY_ID));
    });

    it("サブテーブルの中のフィールドも、サブテーブルの中とトップレベルの両方で合わせる", () => {
      const restated = restateBaseFields(
        withSubtable(holderField("f", BY_ID)),
        withSubtable(holderField("f", REMOTE)),
        withSubtable(holderField("f", BY_CODE)),
      );

      expect(restated).toStrictEqual(withSubtable(holderField("f", BY_CODE)));
    });
  });
});
