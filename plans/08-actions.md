# 08: アクション設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getAppActions()` / `client.app.updateAppActions()` を使用

## 公式ドキュメント

- アクション設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-action-settings/>
- アクション設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-action-settings/>

## APIレスポンス構造

```
GET /k/v1/app/actions.json → { actions: { [name]: ActionConfig }, revision }
PUT /k/v1/preview/app/actions.json ← { app, actions: { [name]: ActionConfig }, revision? }
```

ActionConfigのプロパティ:
- `name`, `id`, `index`
- `destApp`: `{ app, code }` （コピー先アプリ）
- `mappings[]`: `{ srcType: "FIELD" | "RECORD_URL", srcField?, destField }`
- `entities[]`: `{ type: USER | GROUP | ORGANIZATION, code }`
- `filterCond`: 実行条件クエリ

## YAMLスキーマ例

```yaml
actions:
  見積書を作成:
    index: 0
    destApp:
      code: estimate-app
    mappings:
      - srcType: FIELD
        srcField: 顧客名
        destField: 顧客名
      - srcType: RECORD_URL
        destField: 元レコード
    entities:
      - type: GROUP
        code: everyone
    filterCond: ""
```

## コマンド

| コマンド | 説明 |
|---|---|
| `action capture` | 現在のアクション設定をYAMLに出力 |
| `action apply` | YAMLからアクション設定を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/action/
  entity.ts, valueObject.ts, errorCode.ts
  ports/actionConfigurator.ts, ports/actionStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/actionConfigurator.ts
src/core/adapters/local/actionStorage.ts

src/core/application/container/action.ts
src/core/application/action/
  captureAction.ts, applyAction.ts, parseConfig.ts, saveAction.ts, __tests__/

src/cli/commands/action/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- `destApp` はアプリIDまたはアプリコードで指定。環境間移行ではアプリコードを推奨
- `destApp.app`（数値ID）は環境依存のため、YAMLでは `code` を優先的に使う
- マルチアプリモードではコピー先アプリの依存関係に注意（`projectConfig` の `dependsOn` で管理）
- デプロイが必要
