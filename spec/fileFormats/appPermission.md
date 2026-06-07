# アプリアクセス権設定ファイル仕様

アプリレベルのアクセス権の設定ファイルフォーマット。

## kintone API リファレンス

- [アプリのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-permissions/)
- [アプリのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-app-permissions/)

## フォーマット

YAML形式で記述する。

```yaml
rights:
  - entity:
      type: USER
      code: admin_user
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: GROUP
      code: general_staff
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
```

## フィールド定義

**`rights[]`**（エンティティごとのアプリアクセス権）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `entity.type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` \| `"CREATOR"` | 必須 | エンティティの種別 |
| `entity.code` | string | 任意 | エンティティのコード（`CREATOR` 以外は必須・空文字不可。後述） |
| `includeSubs` | boolean | 任意 | サブ組織・サブグループを含めるか。省略時は `false` |
| `appEditable` | boolean | 必須 | アプリ設定の変更権限 |
| `recordViewable` | boolean | 必須 | レコードの閲覧権限 |
| `recordAddable` | boolean | 必須 | レコードの追加権限 |
| `recordEditable` | boolean | 必須 | レコードの編集権限 |
| `recordDeletable` | boolean | 必須 | レコードの削除権限 |
| `recordImportable` | boolean | 必須 | レコードのインポート権限 |
| `recordExportable` | boolean | 必須 | レコードのエクスポート権限 |

## エンティティの指定

`entity.type` には以下の種別を指定する。

| type | 説明 | `code` |
| --- | --- | --- |
| `USER` | 特定のkintoneユーザー | 必須（ユーザー名） |
| `GROUP` | kintoneグループ | 必須（グループコード） |
| `ORGANIZATION` | kintone組織 | 必須（組織コード） |
| `CREATOR` | レコードの作成者（kintone 提供の特殊エンティティ） | 任意（識別コードを持たないため省略可） |

- 「すべてのユーザー（EVERYONE）」は専用の種別ではなく、`type: GROUP`・`code: everyone` という kintone 組み込みの擬似グループとして表現する。

```yaml
rights:
  - entity:
      type: GROUP
      code: everyone
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
```

- `CREATOR` は識別コードを持たないため `code` を省略できる。

```yaml
rights:
  - entity:
      type: CREATOR
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
```

## 適用時の挙動

- `rights` の配列順序は評価優先度を意味する。kintone はアクセス権を上から順に評価し、最初に合致したエンティティの権限を適用する。
- apply はリモートのアプリアクセス権を `rights` 全体で**全置換**する。ファイルに存在しないエンティティの権限はリモートから削除される。
- apply は capture 時に取得した revision を用いた楽観ロックで更新する。取得から更新までの間にリモートが変更されていた場合は競合として失敗する。
- 同一エンティティ（`type` と `code` の組）を重複して指定することはできない。

## バリデーション

パース時に以下を検証する。詳細は [AppPermission ドメイン仕様](../domains/appPermission.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `AP_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`rights` が配列でない 等） |
| `AP_INVALID_ENTITY_TYPE` | `entity.type` が許容値以外 |
| `AP_INVALID_BOOLEAN_FIELD` | 権限フラグ・`includeSubs` が真偽値でない |
| `AP_EMPTY_ENTITY_CODE` | `CREATOR` 以外で `entity.code` が空文字 |
| `AP_DUPLICATE_ENTITY` | 同一エンティティ（`type` と `code` の組）が重複している |

## エラーコード

| 定数 | コード |
| --- | --- |
| `ApInvalidConfigStructure` | `AP_INVALID_CONFIG_STRUCTURE` |
| `ApInvalidEntityType` | `AP_INVALID_ENTITY_TYPE` |
| `ApInvalidBooleanField` | `AP_INVALID_BOOLEAN_FIELD` |
| `ApEmptyEntityCode` | `AP_EMPTY_ENTITY_CODE` |
| `ApDuplicateEntity` | `AP_DUPLICATE_ENTITY` |
