# アクション設定ファイル仕様

アクション（レコードコピー）設定の設定ファイルフォーマット。アクションはアクション名をキーとして識別される。

## kintone API リファレンス

- [アプリのアクション設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-action-settings/)
- [アプリのアクション設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-action-settings/)

## フォーマット

YAML形式で記述する。

```yaml
actions:
  案件コピー:
    index: 0
    destApp:
      app: "20"
    mappings:
      - srcType: FIELD
        srcField: customer_name
        destField: customer_name
      - srcType: FIELD
        srcField: amount
        destField: amount
      - srcType: RECORD_URL
        destField: source_url
    entities:
      - type: USER
        code: admin_user
      - type: GROUP
        code: sales_team
    filterCond: status in ("approved")
```

`destApp` を環境に依存しないアプリコードで指定する場合は次のように記述する。

```yaml
actions:
  案件コピー:
    index: 0
    destApp:
      code: PROJECT
    mappings:
      - srcType: FIELD
        srcField: customer_name
        destField: customer_name
    entities:
      - type: USER
        code: admin_user
    filterCond: ""
```

## フィールド定義

アクションは `actions` 配下のキー（アクション名）で識別される。

**`actions.<アクション名>`**（Action）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `index` | number | 必須 | 表示順序（非負整数、`actions` 内で一意） |
| `destApp` | DestApp | 必須 | コピー先アプリの指定 |
| `mappings` | ActionMapping[] | 必須 | コピー元・コピー先フィールドの対応 |
| `entities` | ActionEntity[] | 任意 | アクションを実行できるエンティティの配列 |
| `filterCond` | string | 任意 | 実行条件。省略時は空文字（`""`） |

**`actions.<name>.destApp`**（DestApp）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `app` | string | 任意 | コピー先アプリID（環境固有）。`code` と一方は必須 |
| `code` | string | 任意 | コピー先アプリコード（環境非依存）。`app` と一方は必須 |

**`actions.<name>.mappings[]`**（ActionMapping）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `srcType` | `"FIELD"` \| `"RECORD_URL"` | 必須 | コピー元の種別 |
| `srcField` | string | 任意 | コピー元フィールドコード（`srcType: FIELD` で必須、`RECORD_URL` では記述しない） |
| `destField` | string | 必須 | コピー先フィールドコード（空文字不可） |

**`actions.<name>.entities[]`**（ActionEntity）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` | 必須 | エンティティの種別 |
| `code` | string | 必須 | エンティティのコード（空文字不可） |

## フィールドの値域・制約

- `actions` のキー: アクション名。空文字不可。キーがそのままアクション名になるため、各アクション定義に `name` プロパティは記述しない（記述しても無視される）
- `index`: 表示順序。非負整数。`actions` 全体で一意でなければならない（重複不可）
- `destApp`: `app`（アプリID＝環境固有の数値ID）または `code`（アプリコード＝環境非依存）のいずれか一方は必須
    - `app` は環境ごとに異なるため、環境間で移行する設定では環境非依存の `code` を用いることが推奨される（[アクションドメイン](../domains/action.md#destappapp環境固有idの解決規則) を参照）
- `mappings[].srcType`: `FIELD` または `RECORD_URL`
    - `FIELD` の場合は `srcField`（コピー元フィールドコード）が必須
    - `RECORD_URL` の場合は `srcField` を記述しない
    - `destField`（コピー先フィールドコード）は必須・空文字不可
- `entities[].type`: `USER` / `GROUP` / `ORGANIZATION`、`entities[].code`: 空文字不可
- `filterCond`: 実行条件。省略時は空文字（`""`）

## 反映方式

`action apply` はアクション設定を**全置換**で反映する。設定ファイルに存在しないアクションはリモートからも削除される（[apply の更新戦略](../domains/action.md#apply-の更新戦略) を参照）。

## バリデーション

パース時に以下を検証する。詳細は [Action ドメイン仕様](../domains/action.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `AC_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`actions` がオブジェクトでない、`destApp` の欠落 等） |
| `AC_INVALID_SRC_TYPE` | `mappings[].srcType` が `FIELD` / `RECORD_URL` 以外 |
| `AC_INVALID_ENTITY_TYPE` | `entities[].type` が許容値以外 |
| `AC_EMPTY_ACTION_NAME` | アクション名（`actions` のキー）が空文字 |
| `AC_DUPLICATE_INDEX` | `index` が `actions` 内で重複している |

## エラーコード

| 定数 | コード |
| --- | --- |
| `AcInvalidConfigStructure` | `AC_INVALID_CONFIG_STRUCTURE` |
| `AcInvalidSrcType` | `AC_INVALID_SRC_TYPE` |
| `AcInvalidEntityType` | `AC_INVALID_ENTITY_TYPE` |
| `AcEmptyActionName` | `AC_EMPTY_ACTION_NAME` |
| `AcDuplicateIndex` | `AC_DUPLICATE_INDEX` |
