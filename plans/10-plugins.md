# 10: プラグイン設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getPlugins()` / `client.plugin.addPluginToApp()` 等を使用

## 公式ドキュメント

- アプリに追加されているプラグインの一覧を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-plugins/>（※要URL確認）
- アプリにプラグインを追加する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/add-app-plugin/>（※要URL確認）
- インストール済みプラグインの一覧を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/plugins/get-installed-plugins/>（※要URL確認）

## APIレスポンス構造

```
GET /k/v1/app/plugins.json → { plugins: [{ id, name, enabled }], revision }
POST /k/v1/preview/app/plugins.json ← { app, ids: [pluginId] }
```

pluginのプロパティ:
- `id`: プラグインID（英数字文字列）
- `name`: プラグイン名
- `enabled`: 有効/無効

## YAMLスキーマ例

```yaml
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン       # 識別用（apply時には使わない）
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
```

## コマンド

| コマンド | 説明 |
|---|---|
| `plugin capture` | 現在のプラグイン一覧をYAMLに出力 |
| `plugin apply` | YAMLからプラグインを追加（差分適用） |

## 作成するファイル

```
src/core/domain/plugin/
  entity.ts, valueObject.ts, errorCode.ts
  ports/pluginConfigurator.ts, ports/pluginStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/pluginConfigurator.ts
src/core/adapters/local/pluginStorage.ts

src/core/application/container/plugin.ts
src/core/application/plugin/
  capturePlugin.ts, applyPlugin.ts, parseConfig.ts, savePlugin.ts, __tests__/

src/cli/commands/plugin/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意・制約

- プラグインの**設定内容**（プラグイン固有の設定画面で行う設定）はREST APIでは管理不可。追加/削除のみ
- プラグイン自体のインストール（システム管理者権限）は本ツールのスコープ外
- プラグインがkintone環境にインストールされていない場合はエラーとする
- `name` はcapture時の参考情報。apply時は `id` のみ使用
- デプロイが必要
- 公式ドキュメントのURLはkintone JS SDKの対応メソッド名から正確なパスを確認すること
