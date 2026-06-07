# FieldPermission

## ドメイン名

FieldPermission

> ドメイン名は `Permission`、CLI コマンド名は `field-acl` を用いる。これは kintone のアクセス制御リスト（access control list = ACL）に由来する命名であり、ドメイン層では「アクセス権（Permission）」、CLI 層では慣用的な略称 `acl` を採用しているため名称が異なる。

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| フィールドアクセス権設定 | FieldPermissionConfig | フィールドアクセス権の望ましい状態を定義した設定 |
| フィールドアクセス権 | FieldRight | 特定フィールドに対するアクセス権エンティティのリスト |
| アクセシビリティ | FieldRightAccessibility | フィールドへのアクセスレベル（READ, WRITE, NONE） |
| エンティティタイプ | FieldPermissionEntityType | アクセス権の対象の種別（USER, GROUP, ORGANIZATION, FIELD_ENTITY） |
| フィールドアクセス権エンティティ | FieldRightEntity | フィールドに対する個別のアクセス権設定 |
| フィールドアクセス権対象 | FieldPermissionEntity | アクセス権の対象の識別情報（タイプとコード） |

## エンティティ

### FieldRight

特定フィールドに対するアクセス権の集合。

```typescript
type FieldRight = Readonly<{
  code: string;
  entities: readonly FieldRightEntity[];
}>;
```

- `code` はフィールドコード
- `entities` はアクセス権エンティティのリスト

### FieldPermissionConfig

フィールドアクセス権の望ましい状態を定義する設定。ローカル設定ファイルから読み込まれる。

```typescript
type FieldPermissionConfig = Readonly<{
  rights: readonly FieldRight[];
}>;
```

- `rights` はフィールドアクセス権のリスト
- 不変（Readonly）であり、変更操作は新しいインスタンスを生成する

## 値オブジェクト

### FieldRightAccessibility

フィールドへのアクセスレベル。

```typescript
type FieldRightAccessibility = "READ" | "WRITE" | "NONE";
```

- `READ`: 閲覧のみ可能
- `WRITE`: 閲覧・編集が可能
- `NONE`: 閲覧・編集ともに不可

### FieldPermissionEntityType

アクセス権の対象の種別。

```typescript
type FieldPermissionEntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";
```

- `USER`: 特定のkintoneユーザー
- `GROUP`: kintoneグループ
- `ORGANIZATION`: kintone組織
- `FIELD_ENTITY`: フィールドベースのエンティティ（作成者、更新者など）

### FieldPermissionEntity

アクセス権の対象の識別情報。

```typescript
type FieldPermissionEntity = Readonly<{
  type: FieldPermissionEntityType;
  code: string;
}>;
```

### FieldRightEntity

フィールドに対する個別のアクセス権設定。

```typescript
type FieldRightEntity = Readonly<{
  accessibility: FieldRightAccessibility;
  entity: FieldPermissionEntity;
  includeSubs?: boolean;
}>;
```

- `includeSubs` はサブ組織・サブグループを含めるかどうか（オプション）

## ドメインサービス

### FieldPermissionConfigParser

パース済みのフィールドアクセス権設定データ（`unknown`）を検証し、`FieldPermissionConfig` に変換する純粋関数。YAMLテキストのパースはアプリケーション層（ConfigCodec）が担い、本関数はその結果である pre-parsed な `unknown` を受け取る。

```typescript
const FieldPermissionConfigParser = {
  parse: (parsed: unknown): FieldPermissionConfig;
};
```

- 構造が不正な場合（オブジェクトでない、`rights` 配列を持たない等）は `BusinessRuleError(FP_INVALID_CONFIG_STRUCTURE)` をスローする
- accessibilityが不正な値の場合は `BusinessRuleError(FP_INVALID_ACCESSIBILITY)` をスローする
- entityTypeが不正な場合は `BusinessRuleError(FP_INVALID_ENTITY_TYPE)` をスローする
- フィールドコードが空の場合は `BusinessRuleError(FP_EMPTY_FIELD_CODE)` をスローする
- エンティティコードが空の場合は `BusinessRuleError(FP_EMPTY_ENTITY_CODE)` をスローする
- フィールドコードが重複する場合は `BusinessRuleError(FP_DUPLICATE_FIELD_CODE)` をスローする
- YAMLテキスト → `unknown` への変換および空テキスト・YAML構文不正の検出はアプリケーション層の責務とする

#### 設定ファイルのフォーマット

[フィールドアクセス権設定ファイル仕様](../fileFormats/fieldPermission.md) を参照。

### FieldPermissionConfigSerializer

フィールドアクセス権設定をシリアライズ用のプレーンなデータ（`Record<string, unknown>`）に変換する純粋関数。`Record<string, unknown>` → YAMLテキストへの変換はアプリケーション層（ConfigCodec）が担う。

```typescript
const FieldPermissionConfigSerializer = {
  serialize: (config: FieldPermissionConfig): Record<string, unknown>;
};
```

- `includeSubs` が未定義のエンティティは出力に含めない

### FieldPermissionDiffDetector

ローカル設定（望ましい状態）とリモート設定（現在の状態）を比較し、差分を検出する純粋関数。

```typescript
type FieldPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  fieldCode: string;
  details: string;
}>;

type FieldPermissionDiff = Readonly<{
  entries: readonly FieldPermissionDiffEntry[];
  summary: Readonly<{
    added: number;
    modified: number;
    deleted: number;
    total: number;
  }>;
  isEmpty: boolean;
  warnings: readonly string[];
}>;

const FieldPermissionDiffDetector = {
  detect: (
    local: FieldPermissionConfig,
    remote: FieldPermissionConfig,
  ): FieldPermissionDiff;
};
```

- ローカルにあり、リモートにないフィールド → 追加（added）
- 両方に存在するが、アクセス権エンティティの内容が異なるフィールド → 変更（modified）
- リモートにあり、ローカルにないフィールド → 削除（deleted）
- エンティティの比較では `accessibility`・`entity.type`・`entity.code`・`includeSubs`（未指定は `false` 扱い）を対象とする。エンティティの順序も差分判定に含める（kintone のフィールドアクセス権評価では順序が優先度を意味するため）
- `details` は変更内容の要約テキスト（例: `entities: USER:user1(write) -> USER:user1(read)`）
- `entries` は差分種別でソートされる（added → modified → deleted の順）
- `isEmpty` は差分がない場合に `true`

## ポート

### FieldPermissionConfigurator

kintoneアプリのフィールドアクセス権を取得・更新するためのインターフェース。

```typescript
interface FieldPermissionConfigurator {
  getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }>;
  updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getFieldPermissions()` は現在のフィールドアクセス権をドメイン型に変換して返す
- `updateFieldPermissions()` はフィールドアクセス権を更新する（全置換方式）
- API通信に失敗した場合は `SystemError` をスローする

### FieldPermissionStorage

フィールドアクセス権設定テキストを永続化・取得するためのインターフェース。

```typescript
interface FieldPermissionStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする
