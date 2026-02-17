# RecordPermission

## ドメイン名

RecordPermission

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| レコードアクセス権設定 | RecordPermissionConfig | レコードのアクセス権の望ましい状態を定義した設定 |
| レコード権限 | RecordRight | 特定の条件に合致するレコードに対するアクセス権設定 |
| レコード権限エンティティ | RecordPermissionRightEntity | レコードに対する個別のアクセス権設定 |

## エンティティ

### RecordRight

特定の条件に合致するレコードに対するアクセス権設定。

```typescript
type RecordRight = Readonly<{
  filterCond: string;
  entities: readonly RecordPermissionRightEntity[];
}>;
```

- `filterCond` はレコードのフィルター条件（空文字列の場合は全レコードが対象）
- `entities` はアクセス権エンティティのリスト

### RecordPermissionConfig

レコードアクセス権の全体設定。

```typescript
type RecordPermissionConfig = Readonly<{
  rights: readonly RecordRight[];
}>;
```

## 値オブジェクト

### RecordPermissionEntityType

権限対象の種別。

```typescript
type RecordPermissionEntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";
```

### RecordPermissionEntity

権限対象の識別情報。

```typescript
type RecordPermissionEntity = Readonly<{
  type: RecordPermissionEntityType;
  code: string;
}>;
```

### RecordPermissionRightEntity

レコードに対する個別のアクセス権設定。

```typescript
type RecordPermissionRightEntity = Readonly<{
  entity: RecordPermissionEntity;
  viewable: boolean;
  editable: boolean;
  deletable: boolean;
  includeSubs: boolean;
}>;
```

## ポート

### RecordPermissionConfigurator

kintoneアプリのレコードアクセス権を取得・更新するためのインターフェース。

### RecordPermissionStorage

レコードアクセス権設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
rights:
  - filterCond: status in ("active")
    entities:
      - entity:
          type: USER
          code: admin_user
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
      - entity:
          type: GROUP
          code: general_staff
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
  - filterCond: ""
    entities:
      - entity:
          type: FIELD_ENTITY
          code: creator
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
```

## CLI

| コマンド | 説明 |
| --- | --- |
| `record-acl apply` | YAML設定ファイルからレコードのアクセス権を適用する |
| `record-acl capture` | 現在のレコードのアクセス権をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--record-acl-file` | `RECORD_ACL_FILE_PATH` | レコードACL設定ファイルパス（デフォルト: `record-acl.yaml`、マルチアプリ: `record-acl/<appName>.yaml`） |
