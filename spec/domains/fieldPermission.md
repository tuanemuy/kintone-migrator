# FieldPermission

## ドメイン名

FieldPermission

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| フィールドアクセス権設定 | FieldPermissionConfig | フィールドアクセス権の望ましい状態を定義した設定 |
| フィールド権限 | FieldRight | 特定フィールドに対するアクセス権エンティティのリスト |
| アクセシビリティ | FieldRightAccessibility | フィールドへのアクセスレベル（READ, WRITE, NONE） |
| エンティティタイプ | EntityType | 権限対象の種別（USER, GROUP, ORGANIZATION, FIELD_ENTITY） |
| フィールド権限エンティティ | FieldRightEntity | フィールドに対する個別のアクセス権設定 |
| フィールド権限対象 | FieldPermissionEntity | 権限対象の識別情報（タイプとコード） |

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

- `rights` はフィールド権限のリスト
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

### EntityType

権限対象の種別。

```typescript
type EntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";
```

- `USER`: 特定のkintoneユーザー
- `GROUP`: kintoneグループ
- `ORGANIZATION`: kintone組織
- `FIELD_ENTITY`: フィールドベースのエンティティ（作成者、更新者など）

### FieldPermissionEntity

権限対象の識別情報。

```typescript
type FieldPermissionEntity = Readonly<{
  type: EntityType;
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

フィールドアクセス権設定のYAMLテキストをパースする純粋関数。

```typescript
const FieldPermissionConfigParser = {
  parse: (rawText: string): FieldPermissionConfig;
};
```

- 空テキストの場合は `BusinessRuleError(FP_EMPTY_CONFIG_TEXT)` をスローする
- YAML構文が不正な場合は `BusinessRuleError(FP_INVALID_CONFIG_YAML)` をスローする
- 構造が不正な場合は `BusinessRuleError(FP_INVALID_CONFIG_STRUCTURE)` をスローする
- accessibilityが不正な値の場合は `BusinessRuleError(FP_INVALID_ACCESSIBILITY)` をスローする
- entityTypeが不正な場合は `BusinessRuleError(FP_INVALID_ENTITY_TYPE)` をスローする
- フィールドコードが空の場合は `BusinessRuleError(FP_EMPTY_FIELD_CODE)` をスローする
- エンティティコードが空の場合は `BusinessRuleError(FP_EMPTY_ENTITY_CODE)` をスローする
- フィールドコードが重複する場合は `BusinessRuleError(FP_DUPLICATE_FIELD_CODE)` をスローする

#### 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
rights:
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
      - accessibility: READ
        entity:
          type: GROUP
          code: group1
        includeSubs: true
```

### FieldPermissionConfigSerializer

フィールドアクセス権設定をYAMLテキストにシリアライズする純粋関数。

```typescript
const FieldPermissionConfigSerializer = {
  serialize: (config: FieldPermissionConfig): string;
};
```

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
