# Plugin

## ドメイン名

Plugin

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| プラグイン設定全体 | PluginsConfig | 設定ファイル1ファイルに対応する、プラグイン定義の集合（`plugins` 配列を持つルート） |
| 個別プラグイン | PluginConfig | 1つのプラグインの定義（`id`/`name`/`enabled`） |

> `PluginsConfig`（複数形、末尾 `s` あり）は設定全体を表すルート型、`PluginConfig`（単数形）はその中の個別プラグイン1件を表す型である。`s` の有無1文字で意味が異なり、`PluginsConfig` を個別プラグインの設定値と取り違えやすいため注意する。配列要素の型は常に `PluginConfig`、`plugins` 配列を包む型が `PluginsConfig` という対応で覚えるとよい。

## エンティティ

### PluginConfig

個別プラグイン1件の定義（単数形。設定全体を表す `PluginsConfig` とは別物である点に注意）。

```typescript
type PluginConfig = Readonly<{
  id: string;
  name: string;
  enabled: boolean;
}>;
```

- `id` はプラグインID
- `name` はプラグイン名
- `enabled` はプラグインの有効/無効。kintone REST API（`get-app-plugins`）が返す実際の有効/無効状態を表す。capture では忠実に記録し diff でも比較・表示する。apply では `enabled: true` のプラグインのみを追加対象とし、`enabled: false` はスキップ＋警告する（後述の制約を参照）。

### PluginsConfig

プラグイン設定の全体（複数形。設定ファイル1ファイルに対応し、`PluginConfig` の配列を保持するルート型）。

```typescript
type PluginsConfig = Readonly<{
  plugins: readonly PluginConfig[];
}>;
```

## apply セマンティクスと制約

kintone REST API はプラグインについて取得（`get-app-plugins`）と追加（`add-app-plugins`）の2操作のみを提供し、**プラグインの無効化・削除、および「無効状態での追加」に対応するエンドポイントが存在しない**（`add-app-plugins` は追加すると有効状態になる）。この制約により apply の振る舞いは以下に限定される。

- **反映方式は `id` ベースのマージ（追加のみ）**。設定ファイルにある `enabled: true` の `id` のうち、リモートに未追加のものだけを `add-app-plugins` で追加する。設定ファイルに存在しないリモートのプラグインは保持し、削除しない（全置換ではない）。
- **`enabled: false` のプラグインはスキップし、警告を出力する**。kintone には「無効状態で追加する」手段がなく、`add-app-plugins` で追加すると必ず有効化されてしまう。これでは `enabled: false`（無効にしたい）というユーザーの意図と逆の結果になるため、apply では追加せずスキップし、「無効化は UI 上で手動対応が必要」である旨を警告する。
- 既にリモートに追加済みの `id` は追加対象から除かれるため、`enabled`（有効→無効）や `name` を変更しても apply では反映されない。`enabled: true → false`（無効化）も API 非対応のため反映できず、UI 手動対応が必要。
- capture で取り込んだ `enabled: false` の状態を apply で再現できない（追加すると有効化される）。これは API の制約であり、ラウンドトリップの非対称として設計上許容する。

diff は added（リモート未追加）/ modified（`name` や `enabled` の変更）/ deleted（リモート専用）を検出して表示するが、apply が実際に反映できるのは added のうち `enabled: true` の追加のみである。`enabled: false` の追加・modified・deleted は diff には現れても apply では反映されない（diff と apply の非対称）。

この制約は他ドメイン（adminNotes/customization/fieldPermission 等が get + update 両 API と全置換/マージを明示するの）とは異なり、kintone API 側の機能制約に起因する点に注意する。

> ⚠️ **実装フォローアップ**: 現状の実装 `src/core/application/plugin/applyPlugin.ts` は `enabled` を参照せず、未追加 `id` を `enabled` の値によらず一律に追加し、警告も出さない。`enabled: false` のプラグインも追加・有効化されてしまうため、本仕様（`enabled: false` はスキップ＋警告）に合わせた修正が必要。

## ポート

### PluginConfigurator

kintoneアプリのプラグイン設定を取得・更新するためのインターフェース。`get-app-plugins`（取得）と `add-app-plugins`（追加）に対応する。無効化・削除に対応する API は存在しないため、本ポートにも対応メソッドを持たない。

### PluginStorage

プラグイン設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[プラグイン設定ファイル仕様](../fileFormats/plugin.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `plugin apply` | YAML設定ファイルからプラグイン設定を適用する |
| `plugin capture` | 現在のプラグイン設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--plugin-file` | `PLUGIN_FILE_PATH` | プラグイン設定ファイルパス（デフォルト: `plugins.yaml`、マルチアプリ: `plugin/<appName>.yaml`） |
