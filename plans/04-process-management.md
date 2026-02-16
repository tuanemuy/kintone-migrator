# 04: プロセス管理（ワークフロー）設定

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getProcessManagement()` / `client.app.updateProcessManagement()` を使用

## 公式ドキュメント

- プロセス管理の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-process-management-settings/>
- プロセス管理の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-process-management-settings/>

## APIレスポンス構造

```
GET /k/v1/app/status.json → { enable, states, actions, revision }
PUT /k/v1/preview/app/status.json ← { app, enable?, states?, actions?, revision? }
```

states（ステータス）:
- `name`, `index`
- `assignee.type`: ONE / ALL / ANY
- `assignee.entities[]`: `{ entity: { type, code }, includeSubs }`
  - entity.type: USER / GROUP / ORGANIZATION / FIELD_ENTITY / CREATOR / CUSTOM_FIELD

actions（アクション）:
- `name`, `from`, `to`（ステータス名）
- `filterCond`: 実行条件
- `type`: PRIMARY（担当者のみ）/ SECONDARY（他のユーザーも可）
- `executableUser`: SECONDARY時の実行可能ユーザー

## YAMLスキーマ例

```yaml
enable: true
states:
  未着手:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: CREATOR
  進行中:
    index: 1
    assignee:
      type: ONE
      entities:
        - type: FIELD_ENTITY
          code: 担当者
  完了:
    index: 2
    assignee:
      type: ONE
      entities: []
actions:
  - name: 着手する
    from: 未着手
    to: 進行中
    filterCond: ""
  - name: 完了にする
    from: 進行中
    to: 完了
    filterCond: ""
  - name: 差し戻す
    from: 進行中
    to: 未着手
    filterCond: ""
```

## コマンド

| コマンド | 説明 |
|---|---|
| `process capture` | 現在のプロセス管理設定をYAMLに出力 |
| `process apply` | YAMLからプロセス管理設定を適用（デプロイ含む） |
| `process diff` | 現在の設定とYAMLの差分を表示 |

## 作成するファイル

```
src/core/domain/processManagement/
  entity.ts, valueObject.ts, errorCode.ts
  ports/processManagementConfigurator.ts, ports/processManagementStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/processManagementConfigurator.ts
src/core/adapters/local/processManagementStorage.ts

src/core/application/container/processManagement.ts
src/core/application/processManagement/
  captureProcessManagement.ts, applyProcessManagement.ts, parseConfig.ts, saveProcessManagement.ts, __tests__/

src/cli/commands/process/
  index.ts, capture.ts, apply.ts, diff.ts, __tests__/
```

## 実装上の注意

- `enable: false` で無効化可能。states/actionsを省略した場合は変更しない
- プロセス管理の有効/無効切り替えは既存レコードのステータスに影響するため、確認プロンプトを表示
- ステータス名がアクションの `from`/`to` で参照されるため、整合性チェックをparserで行う
- デプロイが必要
