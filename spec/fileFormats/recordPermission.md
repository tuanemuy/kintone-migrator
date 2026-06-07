# レコードアクセス権設定ファイル仕様

レコードレベルのアクセス権の設定ファイルフォーマット。フィルター条件でレコードを絞り込み、エンティティごとにアクセス権を設定する。

## kintone API リファレンス

- [レコードのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-record-permissions/)
- [レコードのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-record-permissions/)

## フォーマット

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

- `filterCond` が空文字列の場合は全レコードが対象
- `entity.type` には `USER`・`GROUP`・`ORGANIZATION`・`FIELD_ENTITY` を指定でき、いずれも `code` が必須。「すべてのユーザー（EVERYONE）」は `type: GROUP`・`code: everyone` という kintone 組み込みの擬似グループとして表現する

## フィールド定義

**`rights[]`**（フィルター条件ごとのアクセス権ブロック）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `filterCond` | string | 必須 | 対象レコードの絞り込み条件。空文字列は全レコードが対象 |
| `entities` | RecordPermissionEntity[] | 必須 | エンティティごとのアクセス権の配列（評価優先順） |

**`rights[].entities[]`**（RecordPermissionEntity）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `entity.type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` \| `"FIELD_ENTITY"` | 必須 | エンティティの種別 |
| `entity.code` | string | 必須 | エンティティのコード（空文字不可） |
| `viewable` | boolean | 必須 | レコードの閲覧権限 |
| `editable` | boolean | 必須 | レコードの編集権限 |
| `deletable` | boolean | 必須 | レコードの削除権限 |
| `includeSubs` | boolean | 任意 | サブ組織・サブグループを含めるか。省略時は `false` |

## 適用時の挙動

- `rights` の配列順序は評価優先度を意味する。kintone はレコードアクセス権を上から順に評価し、最初に合致した条件の権限を適用する。
- apply はリモートのレコードアクセス権を `rights` 全体で**全置換**する。ファイルに存在しない条件・エンティティの権限はリモートから削除される。
- apply は capture 時に取得した revision を用いた楽観ロックで更新する。取得から更新までの間にリモートが変更されていた場合は競合として失敗する。

## バリデーション

パース時に以下を検証する。詳細は [RecordPermission ドメイン仕様](../domains/recordPermission.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `RP_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`rights` が配列でない 等） |
| `RP_INVALID_ENTITY_TYPE` | `entity.type` が許容値以外 |
| `RP_EMPTY_ENTITY_CODE` | `entity.code` が空文字 |
| `RP_INVALID_PERMISSION_VALUE` | 権限フラグ（`viewable` 等）・`includeSubs` が真偽値でない |
| `RP_DUPLICATE_ENTITY` | 同一ブロック内で同一エンティティが重複している |

## エラーコード

| 定数 | コード |
| --- | --- |
| `RpInvalidConfigStructure` | `RP_INVALID_CONFIG_STRUCTURE` |
| `RpInvalidEntityType` | `RP_INVALID_ENTITY_TYPE` |
| `RpEmptyEntityCode` | `RP_EMPTY_ENTITY_CODE` |
| `RpInvalidPermissionValue` | `RP_INVALID_PERMISSION_VALUE` |
| `RpDuplicateEntity` | `RP_DUPLICATE_ENTITY` |
