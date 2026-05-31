# フィールドアクセス権設定ファイル仕様

フィールドアクセス権の設定ファイルフォーマット。ファイルは完全な望ましい状態を表し、適用時にすべての権限が置換される。

## kintone API リファレンス

- [フィールドのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-field-permissions/)
- [フィールドのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-field-permissions/)

## フォーマット

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
      - accessibility: WRITE
        entity:
          type: FIELD_ENTITY
          code: creator
```

- `entity.type` は `USER`（ユーザー）・`GROUP`（グループ）・`ORGANIZATION`（組織）・`FIELD_ENTITY`（フィールドベースのエンティティ）のいずれか
- `FIELD_ENTITY` はフォーム上のユーザー選択系フィールドや作成者・更新者などのフィールドに基づくエンティティを指す（`code` にフィールドコードを指定）
- `includeSubs` はサブ組織・サブグループを権限の対象に含めるかどうか（任意、省略時は `false` 扱い）。`type` が `ORGANIZATION` または `GROUP` の場合に意味を持つ
- 各 `rights` 要素の `entities` の順序は kintone のアクセス権評価における優先度を表すため保持される

## フィールド定義

**`rights[]`**（フィールドごとのアクセス権）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | 必須 | 対象フィールドのフィールドコード（空文字不可） |
| `entities` | FieldPermissionEntity[] | 必須 | エンティティごとのアクセス権の配列（評価優先順） |

**`rights[].entities[]`**（FieldPermissionEntity）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `accessibility` | `"READ"` \| `"WRITE"` \| `"NONE"` | 必須 | アクセス権の種類 |
| `entity.type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` \| `"FIELD_ENTITY"` | 必須 | エンティティの種別 |
| `entity.code` | string | 必須 | エンティティのコード（`FIELD_ENTITY` の場合はフィールドコード。空文字不可） |
| `includeSubs` | boolean | 任意 | サブ組織・サブグループを含めるか。省略時は `false`。`GROUP` / `ORGANIZATION` で意味を持つ |

## バリデーション

パース時に以下を検証する。詳細は [FieldPermission ドメイン仕様](../domains/fieldPermission.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `FP_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`rights` が配列でない 等） |
| `FP_INVALID_ACCESSIBILITY` | `accessibility` が `READ` / `WRITE` / `NONE` 以外 |
| `FP_INVALID_ENTITY_TYPE` | `entity.type` が許容値以外 |
| `FP_INVALID_BOOLEAN_FIELD` | `includeSubs` が真偽値でない |
| `FP_EMPTY_FIELD_CODE` | `code` が空文字 |
| `FP_EMPTY_ENTITY_CODE` | `entity.code` が空文字 |
| `FP_DUPLICATE_FIELD_CODE` | 同一の `code` を持つ `rights` 要素が複数存在する |

## エラーコード

| 定数 | コード |
| --- | --- |
| `FpInvalidConfigStructure` | `FP_INVALID_CONFIG_STRUCTURE` |
| `FpInvalidAccessibility` | `FP_INVALID_ACCESSIBILITY` |
| `FpInvalidEntityType` | `FP_INVALID_ENTITY_TYPE` |
| `FpInvalidBooleanField` | `FP_INVALID_BOOLEAN_FIELD` |
| `FpEmptyFieldCode` | `FP_EMPTY_FIELD_CODE` |
| `FpEmptyEntityCode` | `FP_EMPTY_ENTITY_CODE` |
| `FpDuplicateFieldCode` | `FP_DUPLICATE_FIELD_CODE` |
