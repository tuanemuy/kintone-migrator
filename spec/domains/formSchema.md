# FormSchema

## ドメイン名

FormSchema

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| スキーマ | Schema | フォームの望ましい状態を定義したスキーマ |
| フィールド定義 | FieldDefinition | スキーマにおける個別フィールドの設定内容（コード、型、ラベル、プロパティ） |
| フォームフィールド | FormField | kintoneフォーム上の現在のフィールド設定 |
| フィールドコード | FieldCode | フィールドを一意に識別するコード |
| フィールド型 | FieldType | フィールドの種類（SINGLE_LINE_TEXT, NUMBER, DATE など） |
| フィールドプロパティ | FieldProperties | フィールドの詳細設定値（必須、ユニーク、デフォルト値、選択肢など） |
| 差分 | FormDiff | スキーマと現在のフォーム設定の比較結果 |
| 差分エントリ | DiffEntry | 個別フィールドの差分情報（差分種別、フィールドコード、変更内容） |
| 差分種別 | DiffType | 追加（Added）・変更（Modified）・削除（Deleted）のいずれか |
| 差分サマリー | DiffSummary | 差分の集計情報（追加・変更・削除の件数） |
| マイグレーション | Migration | 差分のみを適用してフォーム設定を更新する操作 |
| 強制上書き | ForceOverride | スキーマでフォーム設定を完全に置き換える操作。スキーマにないフィールドは削除される |
| スキーマ生成 | SchemaCapture | 現在のフォーム設定からスキーマを生成する操作 |
| レイアウト | FormLayout | フォームのフィールド配置構造。行（ROW）、グループ（GROUP）、サブテーブル（SUBTABLE）で構成される |
| レイアウト行 | LayoutRow | レイアウトの1行。フィールドや装飾要素を含む |
| レイアウト要素 | LayoutElement | レイアウト行内の個別要素。フィールド、装飾要素、システムフィールドのいずれか |
| 装飾要素 | DecorationElement | ラベル、スペーサー、水平線などの非フィールド要素 |
| 要素サイズ | ElementSize | レイアウト要素の表示サイズ（幅、高さ、内部高さ） |

## エンティティ

本ドメインはステートレスな変換操作が中心であり、ライフサイクルを持つ従来のエンティティは定義しない。代わりに、以下の集約的な不変型をドメインの中核として扱う。

### Schema

フォームの望ましい状態を定義するスキーマ。FieldDefinitionの集合とレイアウト情報を保持する。

```typescript
type Schema = Readonly<{
  fields: ReadonlyMap<FieldCode, FieldDefinition>;
  layout: FormLayout;
}>;
```

- `fields` はFieldCodeをキーとするMap。同一のFieldCodeを持つフィールドは存在しない
- `layout` はフォームのレイアウト構造を表す。レイアウト要素からフィールド情報が導出される
- 不変（Readonly）であり、変更操作は新しいインスタンスを生成する

### FormDiff

スキーマと現在のフォーム設定の比較結果。

```typescript
type FormDiff = Readonly<{
  entries: readonly DiffEntry[];
  summary: DiffSummary;
  isEmpty: boolean;
}>;
```

- `isEmpty` は差分がない場合に `true`
- `entries` は差分種別でソートされる（追加 → 変更 → 削除の順）

## 値オブジェクト

### LookupFieldMapping / Lookup

ルックアップフィールドの設定を表す型。

```typescript
type LookupFieldMapping = Readonly<{
  field: string;
  relatedField: string;
}>;

type Lookup = Readonly<{
  relatedApp: Readonly<{ app: string; code?: string }>;
  relatedKeyField: string;
  fieldMappings: readonly LookupFieldMapping[];
  lookupPickerFields: readonly string[];
  filterCond?: string;
  sort?: string;
}>;
```

- ルックアップ対応フィールド（SINGLE_LINE_TEXT, NUMBER, LINK）の `lookup` プロパティで使用
- `relatedApp` は参照先アプリの識別情報
- `fieldMappings` は参照先フィールドとのマッピング定義

### FieldCode

フィールドを一意に識別するブランド型。

```typescript
type FieldCode = string & { readonly brand: "FieldCode" };

const FieldCode = {
  create: (code: string): FieldCode;
};
```

- 空文字列は不可

### FieldType

kintoneのフィールド型を表すユニオン型。

```typescript
type FieldType =
  | "SINGLE_LINE_TEXT"
  | "MULTI_LINE_TEXT"
  | "RICH_TEXT"
  | "NUMBER"
  | "CALC"
  | "CHECK_BOX"
  | "RADIO_BUTTON"
  | "MULTI_SELECT"
  | "DROP_DOWN"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "LINK"
  | "USER_SELECT"
  | "ORGANIZATION_SELECT"
  | "GROUP_SELECT"
  | "FILE"
  | "GROUP"
  | "SUBTABLE"
  | "REFERENCE_TABLE";
```

### FieldDefinition

個別フィールドの設定内容。スキーマ・現在のフォーム設定の両方を正規化した共通表現。`FieldType` ごとの Discriminated Union として定義し、フィールド型とプロパティの対応関係を型レベルで保証する。

```typescript
type FieldDefinitionBase = Readonly<{
  code: FieldCode;
  label: string;
  noLabel?: boolean;
}>;

type FieldDefinition =
  | SingleLineTextFieldDefinition
  | MultiLineTextFieldDefinition
  | RichTextFieldDefinition
  | NumberFieldDefinition
  | CalcFieldDefinition
  | SelectionFieldDefinition
  | DateFieldDefinition
  | TimeFieldDefinition
  | DateTimeFieldDefinition
  | LinkFieldDefinition
  | UserSelectFieldDefinition
  | FileFieldDefinition
  | GroupFieldDefinition
  | SubtableFieldDefinition
  | ReferenceTableFieldDefinition;
```

### フィールド型別プロパティ

フィールド型ごとに有効なプロパティを型レベルで定義する。

#### テキスト系フィールド

```typescript
type SingleLineTextFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "SINGLE_LINE_TEXT";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
      expression?: string;
      hideExpression?: boolean;
      lookup?: Lookup;
    }>;
  }>;

type MultiLineTextFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "MULTI_LINE_TEXT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
    }>;
  }>;

type RichTextFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "RICH_TEXT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
    }>;
  }>;
```

- **SINGLE_LINE_TEXT**: `unique`, `expression`, `hideExpression`, `lookup` プロパティを持つ
- **MULTI_LINE_TEXT**: `unique`, `expression` プロパティを持たない（kintone API の仕様に準拠）

#### 数値系フィールド

```typescript
type NumberFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "NUMBER";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      minValue?: string;
      maxValue?: string;
      digit?: boolean;
      displayScale?: string;
      unit?: string;
      unitPosition?: "BEFORE" | "AFTER";
      lookup?: Lookup;
    }>;
  }>;

type CalcFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "CALC";
    properties: Readonly<{
      expression: string;
      format?: "NUMBER" | "NUMBER_DIGIT" | "DATE" | "TIME" | "DATETIME" | "HOUR_MINUTE" | "DAY_HOUR_MINUTE";
      displayScale?: string;
      unit?: string;
      unitPosition?: "BEFORE" | "AFTER";
      hideExpression?: boolean;
    }>;
  }>;
```

#### 選択系フィールド

```typescript
type SelectionOption = Readonly<{
  label: string;
  index: string;
}>;

type MultiValueSelectionFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "CHECK_BOX" | "MULTI_SELECT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: readonly string[];
      options: Readonly<Record<string, SelectionOption>>;
      align?: "HORIZONTAL" | "VERTICAL";
    }>;
  }>;

type SingleValueSelectionFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "RADIO_BUTTON" | "DROP_DOWN";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      options: Readonly<Record<string, SelectionOption>>;
      align?: "HORIZONTAL" | "VERTICAL";
    }>;
  }>;

type SelectionFieldDefinition =
  | MultiValueSelectionFieldDefinition
  | SingleValueSelectionFieldDefinition;
```

- **CHECK_BOX / MULTI_SELECT**（複数選択）: `defaultValue` は文字列の配列
- **RADIO_BUTTON / DROP_DOWN**（単一選択）: `defaultValue` は文字列

#### 日時系フィールド

```typescript
type DateFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "DATE";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;

type TimeFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "TIME";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;

type DateTimeFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "DATETIME";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      defaultNowValue?: boolean;
    }>;
  }>;
```

#### その他のフィールド

```typescript
type LinkFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "LINK";
    properties: Readonly<{
      required?: boolean;
      unique?: boolean;
      defaultValue?: string;
      minLength?: string;
      maxLength?: string;
      protocol?: "WEB" | "CALL" | "MAIL";
      lookup?: Lookup;
    }>;
  }>;

type UserSelectFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "USER_SELECT" | "ORGANIZATION_SELECT" | "GROUP_SELECT";
    properties: Readonly<{
      required?: boolean;
      defaultValue?: readonly Readonly<{ code: string; type: string }>[];
      entities?: readonly Readonly<{ code: string; type: string }>[];
    }>;
  }>;

type FileFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "FILE";
    properties: Readonly<{
      required?: boolean;
      thumbnailSize?: string;
    }>;
  }>;
```

#### レイアウト系フィールド

```typescript
type GroupFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "GROUP";
    properties: Readonly<{
      openGroup?: boolean;
    }>;
  }>;

type SubtableFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "SUBTABLE";
    properties: Readonly<{
      fields: ReadonlyMap<FieldCode, FieldDefinition>;
    }>;
  }>;

type ReferenceTableFieldDefinition = FieldDefinitionBase &
  Readonly<{
    type: "REFERENCE_TABLE";
    properties: Readonly<{
      referenceTable: Readonly<{
        relatedApp: Readonly<{ app: string }>;
        condition: Readonly<{
          field: FieldCode;
          relatedField: FieldCode;
        }>;
        filterCond?: string;
        displayFields: readonly FieldCode[];
        sort?: string;
        size?: string;
      }>;
    }>;
  }>;
```

### DiffEntry

個別フィールドの差分情報。

```typescript
type DiffEntry = Readonly<{
  type: DiffType;
  fieldCode: FieldCode;
  fieldLabel: string;
  details: string;
  before?: FieldDefinition;
  after?: FieldDefinition;
}>;
```

- `type === "added"` の場合: `before` は未定義、`after` は追加されるフィールド
- `type === "modified"` の場合: `before` は変更前、`after` は変更後
- `type === "deleted"` の場合: `before` は削除されるフィールド、`after` は未定義
- `details` は変更内容の要約テキスト（例: 「必須 → 任意」「新規追加」「削除」）

### DiffType

差分の種別。

```typescript
type DiffType = "added" | "modified" | "deleted";
```

### DiffSummary

差分の集計情報。

```typescript
type DiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;
```

### ElementSize

レイアウト要素の表示サイズ。

```typescript
type ElementSize = Readonly<{
  width?: string;
  height?: string;
  innerHeight?: string;
}>;
```

### DecorationElement

装飾要素（ラベル、スペーサー、水平線）。

```typescript
type LabelElement = Readonly<{
  type: "LABEL";
  label: string;
  elementId: string;
  size: ElementSize;
}>;

type SpacerElement = Readonly<{
  type: "SPACER";
  elementId: string;
  size: ElementSize;
}>;

type HrElement = Readonly<{
  type: "HR";
  elementId: string;
  size: ElementSize;
}>;

type DecorationElement = LabelElement | SpacerElement | HrElement;
```

### LayoutField

フィールドとそのレイアウトサイズ情報を組み合わせた型。

```typescript
type LayoutField = Readonly<{
  field: FieldDefinition;
  size?: ElementSize;
}>;
```

### SystemFieldLayout

システムフィールドのレイアウト情報。システムフィールドは FieldType に含まれず、レイアウト上の配置情報のみを保持する。

```typescript
type SystemFieldLayout = Readonly<{
  code: string;
  type: string;
  size?: ElementSize;
}>;
```

### LayoutElement

レイアウト行内の個別要素。フィールド、装飾要素、システムフィールドのユニオン型。

```typescript
type LayoutElement = LayoutField | DecorationElement | SystemFieldLayout;
```

### レイアウト構造型

フォームレイアウトの構造を表す型。

```typescript
type LayoutRow = Readonly<{
  type: "ROW";
  fields: readonly LayoutElement[];
}>;

type GroupLayoutItem = Readonly<{
  type: "GROUP";
  code: FieldCode;
  label: string;
  noLabel?: boolean;
  openGroup?: boolean;
  layout: readonly LayoutRow[];
}>;

type SubtableLayoutItem = Readonly<{
  type: "SUBTABLE";
  code: FieldCode;
  label: string;
  noLabel?: boolean;
  fields: readonly LayoutElement[];
}>;

type LayoutItem = LayoutRow | GroupLayoutItem | SubtableLayoutItem;

type FormLayout = readonly LayoutItem[];
```

## ドメインサービス

### DiffDetector

スキーマと現在のフォームフィールドを比較し、差分を検出する純粋関数。

```typescript
const DiffDetector = {
  detect: (
    schema: Schema,
    current: ReadonlyMap<FieldCode, FieldDefinition>,
  ): FormDiff;

  detectLayoutChanges: (
    schemaLayout: FormLayout,
    currentLayout: FormLayout,
  ): boolean;
};
```

#### detect

- `schema` にあり `current` にないフィールド → 追加（Added）
- 両方に存在するが設定値が異なるフィールド → 変更（Modified）
- `current` にあり `schema` にないフィールド → 削除（Deleted）
- kintoneシステムフィールド（レコード番号、作成者など）は比較対象外とする

#### detectLayoutChanges

- スキーマのレイアウトと現在のレイアウトを比較し、変更があれば `true` を返す

### SchemaParser

スキーマテキストをパースする純粋関数。

```typescript
const SchemaParser = {
  parse: (rawText: string): Schema;
};
```

- パースに失敗した場合は `BusinessRuleError` をスローする
- 空テキストの場合は `BusinessRuleError` をスローする
- 重複するFieldCodeが存在する場合は `BusinessRuleError` をスローする

#### スキーマテキストのフォーマット

スキーマはYAML形式で記述する。レイアウトベースの構造で、kintoneのフォームレイアウト設定に準拠し、SchemaSerializerが生成するテキストとラウンドトリップ整合性を保つ。

```yaml
layout:
  - type: ROW
    fields:
      - code: customer_name
        type: SINGLE_LINE_TEXT
        label: 顧客名
        required: true
        unique: false
        maxLength: "100"
        size:
          width: "200"
  - type: ROW
    fields:
      - code: status
        type: DROP_DOWN
        label: ステータス
        required: true
        options:
          未着手:
            label: 未着手
            index: "0"
          進行中:
            label: 進行中
            index: "1"
          完了:
            label: 完了
            index: "2"
  - type: GROUP
    code: detail_group
    label: 詳細情報
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: note
            type: MULTI_LINE_TEXT
            label: 備考
```

- ルートオブジェクトの `layout` キー配下にレイアウト要素の配列を記述する
- 各レイアウト要素は `type` で種別を判別する（`ROW`、`GROUP`、`SUBTABLE`）
- フィールド定義は `code`、`type`、`label` およびフィールド型固有のプロパティをフラットに記述する（`properties` でラップしない）
- レイアウトサイズ情報は `size` オブジェクトで指定する
- 装飾要素（`LABEL`、`SPACER`、`HR`）は `type` と `elementId` で記述する
- システムフィールド（`RECORD_NUMBER`、`CREATOR` 等）はレイアウト上の配置情報のみを保持する
- YAMLとして不正な文字列の場合は `BusinessRuleError` をスローする
- 旧フォーマット（`fields` キーのみ）が検出された場合はエラーメッセージで新フォーマットへの移行を案内する

### SchemaSerializer

現在のフォームレイアウトをスキーマテキスト（YAML）にシリアライズする純粋関数。スキーマ生成時に使用する。

```typescript
const SchemaSerializer = {
  serialize: (layout: FormLayout): string;
};
```

### SchemaValidator

スキーマのフィールド定義をバリデーションし、問題点を検出する純粋関数。`assertSchemaValid` ユースケースで使用される。

```typescript
type ValidationSeverity = "error" | "warning";

type ValidationIssue = Readonly<{
  severity: ValidationSeverity;
  fieldCode: string;
  fieldType: string;
  rule: string;
  message: string;
}>;

type ValidationResult = Readonly<{
  issues: readonly ValidationIssue[];
  isValid: boolean;
}>;

const SchemaValidator = {
  validate: (schema: Schema): ValidationResult;
};
```

- フィールド型ごとのプロパティ整合性をチェックする（例: 選択肢フィールドの空オプション、数値フィールドの範囲矛盾など）
- `isValid` は `error` レベルの問題がない場合に `true`
- `warning` は問題の可能性があるが動作には影響しないケース

## ポート

### FormConfigurator

フォーム構成を取得・変更するためのインターフェース。

```typescript
interface FormConfigurator {
  getFields(): Promise<ReadonlyMap<FieldCode, FieldDefinition>>;
  addFields(fields: readonly FieldDefinition[]): Promise<void>;
  updateFields(fields: readonly FieldDefinition[]): Promise<void>;
  deleteFields(fieldCodes: readonly FieldCode[]): Promise<void>;
  getLayout(): Promise<FormLayout>;
  updateLayout(layout: FormLayout): Promise<void>;
}
```

- 外部から取得したフォーム情報をドメインの型（FieldDefinition）に変換する責務を持つ
- `getFields()` はシステムフィールド（RECORD_NUMBER、CREATOR 等）を除外して返す。`FieldType` ユニオンにシステムフィールド型を含まないため、アダプター側でフィルタリングする
- API通信に失敗した場合は `SystemError` をスローする

### SchemaStorage

スキーマテキストを永続化・取得するためのインターフェース。

```typescript
interface SchemaStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる（`captureSchema` で既存スキーマ有無の判定に使用）
- API通信に失敗した場合は `SystemError` をスローする

#### LocalFileSchemaStorage (CLI用)

ローカルファイルシステムを使用してスキーマテキストを永続化するアダプター。

- `get()` はファイルが存在しない場合、`{ content: "", exists: false }` を返す（ポート契約準拠）
- `update()` は親ディレクトリが存在しない場合、再帰的に作成する
- ファイルI/Oに失敗した場合は `SystemError(StorageError)` をスローする
- エンコーディングはUTF-8

## ユースケース

### detectDiff

スキーマと現在のフォーム設定の差分を検出する。

- **対応シナリオ**: シナリオ1, シナリオ2, シナリオ3
- **入力**: なし
- **出力**: `FormDiff`
- **処理フロー**:
    1. `SchemaStorage.get()` でスキーマテキストを取得する
    2. `SchemaParser.parse()` でスキーマにパースする
    3. `FormConfigurator.getFields()` で現在のフォームフィールドを取得する
    4. `DiffDetector.detect()` で差分を検出する
    5. `FormDiff` を返却する
- **エラー**:
    - パース失敗 → `BusinessRuleError` を `ValidationError` に変換（スキーマテキストの記述形式不正）
    - API通信失敗 → `SystemError`

### executeMigration

差分のみを適用してフォーム設定を更新する。

- **対応シナリオ**: シナリオ2
- **入力**: なし
- **出力**: `void`
- **処理フロー**:
    1. `SchemaStorage.get()` でスキーマテキストを取得する
    2. `SchemaParser.parse()` でスキーマにパースする
    3. `FormConfigurator.getFields()` と `FormConfigurator.getLayout()` を並行して実行し、現在のフィールド定義とレイアウトを取得する
    4. `DiffDetector.detect()` でフィールドの差分を検出する
    5. `DiffDetector.detectLayoutChanges()` でレイアウトの差分を検出する
    6. フィールド差分もレイアウト差分もない場合は何もせず終了する
    7. 追加フィールドがある場合、`FormConfigurator.addFields()` で追加する
    8. 変更フィールドがある場合、`FormConfigurator.updateFields()` で更新する
    9. 削除フィールドがある場合、`FormConfigurator.deleteFields()` で削除する
    10. レイアウトに差分がある場合、`FormConfigurator.updateLayout()` でレイアウトを更新する
- **操作順序**: 追加 → 変更 → 削除の順に逐次実行する。新規フィールドへの参照を先に確立し、不要フィールドの削除は最後に行うことで、フィールド間の依存関係（サブテーブル内フィールド等）による失敗を防ぐ
- **部分失敗時の方針**: いずれかの操作でAPI通信に失敗した場合、残りの操作は実行せず即座にエラーを返す。既に適用された変更のロールバックは行わない（外部サービスがトランザクションをサポートしないため）
- **エラー**:
    - API通信失敗 → `SystemError`（どのフィールドで失敗したかを含む）

### forceOverrideForm

スキーマでフォーム設定を完全に上書きする。差分の有無にかかわらず、スキーマに含まれる既存フィールドはすべて上書きされる。

- **対応シナリオ**: シナリオ3
- **入力**: なし
- **出力**: `void`
- **処理フロー**:
    1. `SchemaStorage.get()` でスキーマテキストを取得する
    2. `SchemaParser.parse()` でスキーマにパースする
    3. `FormConfigurator.getFields()` で現在のフォームフィールドを取得する
    4. スキーマにあり現在のフォームにないフィールドを `FormConfigurator.addFields()` で追加する
    5. 両方に存在するフィールドを `FormConfigurator.updateFields()` で上書きする（差分有無にかかわらず）
    6. スキーマにないフィールドを `FormConfigurator.deleteFields()` で削除する
- **操作順序**: 追加 → 上書き → 削除の順に逐次実行する。executeMigration と同様の理由で、フィールド間の依存関係を考慮した順序とする
- **部分失敗時の方針**: executeMigration と同様。いずれかの操作でAPI通信に失敗した場合、残りの操作は実行せず即座にエラーを返す
- **エラー**:
    - パース失敗 → `BusinessRuleError` を `ValidationError` に変換
    - API通信失敗 → `SystemError`

### captureSchema

現在のフォーム設定からスキーマテキストを生成する。

- **対応シナリオ**: シナリオ4
- **入力**: なし
- **出力**: `{ schemaText: string; hasExistingSchema: boolean }`
- **処理フロー**:
    1. `FormConfigurator.getLayout()` で現在のフォームレイアウトを取得する
    2. `SchemaSerializer.serialize()` でスキーマテキスト（YAML）を生成する
    3. `SchemaStorage.get()` で既存のスキーマテキストを取得する
    4. 既存設定の有無を判定する
    5. 生成テキストと既存設定の有無を返却する
- **エラー**:
    - API通信失敗 → `SystemError`

### saveSchema

生成されたスキーマテキストを永続化する。

- **対応シナリオ**: シナリオ4
- **入力**: `{ schemaText: string }`
- **出力**: `void`
- **処理フロー**:
    1. `SchemaStorage.update()` でスキーマテキストを保存する
- **エラー**:
    - API通信失敗 → `SystemError`

