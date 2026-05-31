# プロセス管理設定ファイル仕様

プロセス管理（ワークフロー）の設定ファイルフォーマット。ステータス定義とステータス間の遷移アクションを記述する。

## kintone API リファレンス

- [プロセス管理の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-process-management-settings/)
- [プロセス管理の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-process-management-settings/)

## フォーマット

YAML形式で記述する。

```yaml
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: CREATOR
  処理中:
    index: 1
    assignee:
      type: ONE
      entities:
        - type: USER
          code: manager
  完了:
    index: 2
    assignee:
      type: ONE
      entities: []
actions:
  - name: 処理開始
    from: 未処理
    to: 処理中
    filterCond: ""
    type: PRIMARY
    executableUser:
      entities:
        - type: USER
          code: manager
  - name: 完了にする
    from: 処理中
    to: 完了
    filterCond: ""
    type: PRIMARY
```

## フィールド定義

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `enable` | boolean | 必須 | プロセス管理（ワークフロー）を有効にするか |
| `states` | Record<string, State> | 必須 | ステータス名をキーとするステータス定義 |
| `actions` | Action[] | 必須 | ステータス遷移アクションの配列 |

**`states.<ステータス名>`**（State）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `index` | number | 必須 | ステータスの表示順序 |
| `assignee.type` | `"ONE"` \| `"ALL"` \| `"ANY"` | 必須 | 作業者の割り当て方式 |
| `assignee.entities` | ProcessEntity[] | 必須 | 作業者エンティティの配列（空配列可） |

**`actions[]`**（Action）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `name` | string | 必須 | アクション名（`actions` 内で一意） |
| `from` | string | 必須 | 遷移元ステータス名（`states` のキー） |
| `to` | string | 必須 | 遷移先ステータス名（`states` のキー） |
| `filterCond` | string | 任意 | 実行条件。省略時は空文字（`""`） |
| `type` | `"PRIMARY"` \| `"SECONDARY"` | 任意 | アクション種別。省略時は `PRIMARY` |
| `executableUser.entities` | ProcessEntity[] | 任意 | 実行可能ユーザー（`type: SECONDARY` でのみ意味を持つ） |

## states と actions の参照整合性

- `actions` の各要素の `from` / `to` は、`states` のキー（ステータス名）として存在していなければならない。存在しないステータスを参照するとエラーになる
- アクション名（`name`）は `actions` 内で一意でなければならない
- `type` を省略した場合は `PRIMARY` として扱う。`filterCond` を省略した場合は空文字（`""`）として扱う
- `executableUser` は `type: SECONDARY` のアクションでのみ意味を持つ

## エンティティ（entities）の指定

`assignee.entities` および `executableUser.entities` には、担当者・実行可能ユーザーを表すエンティティを列挙する。

| `type` | `code` | `includeSubs` |
| --- | --- | --- |
| `USER` | ユーザーコードを指定 | - |
| `GROUP` | グループコードを指定 | サブグループを含めるか（任意） |
| `ORGANIZATION` | 組織コードを指定 | サブ組織を含めるか（任意） |
| `FIELD_ENTITY` | フィールドコードを指定 | - |
| `CUSTOM_FIELD` | フィールドコードを指定 | - |
| `CREATOR` | 不要（省略可） | - |

- `CREATOR`（レコード作成者）は識別子を必要としないため `code` を省略できる
- `includeSubs` は真偽値で指定する。kintone API 仕様では `ORGANIZATION` および組織選択フィールドを指定した `FIELD_ENTITY` のときのみ意味を持つ（上表の `-` は当該種別では意味を持たないことを示す）

## バリデーション

パース時に以下を検証する。詳細は [ProcessManagement ドメイン仕様](../domains/processManagement.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `PM_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`states` / `actions` の型不一致 等） |
| `PM_INVALID_ASSIGNEE_TYPE` | `assignee.type` が `ONE` / `ALL` / `ANY` 以外 |
| `PM_INVALID_ENTITY_TYPE` | エンティティの `type` が許容値以外 |
| `PM_INVALID_BOOLEAN_FIELD` | `includeSubs` 等の真偽値フィールドが真偽値でない |
| `PM_INVALID_ACTION_REFERENCE` | `actions[].from` / `to` が `states` に存在しない |
| `PM_DUPLICATE_ACTION_NAME` | アクション名（`name`）が `actions` 内で重複している |

## エラーコード

| 定数 | コード |
| --- | --- |
| `PmInvalidConfigStructure` | `PM_INVALID_CONFIG_STRUCTURE` |
| `PmInvalidAssigneeType` | `PM_INVALID_ASSIGNEE_TYPE` |
| `PmInvalidEntityType` | `PM_INVALID_ENTITY_TYPE` |
| `PmInvalidBooleanField` | `PM_INVALID_BOOLEAN_FIELD` |
| `PmInvalidActionReference` | `PM_INVALID_ACTION_REFERENCE` |
| `PmDuplicateActionName` | `PM_DUPLICATE_ACTION_NAME` |
