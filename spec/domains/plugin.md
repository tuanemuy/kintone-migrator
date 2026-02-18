# Plugin

## ドメイン名

Plugin

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| プラグイン設定 | PluginsConfig | プラグインの望ましい状態を定義した設定 |
| プラグイン | PluginConfig | 個別のプラグイン定義 |

## エンティティ

### PluginConfig

個別のプラグイン定義。

```typescript
type PluginConfig = Readonly<{
  id: string;
  name: string;
  enabled: boolean;
}>;
```

- `id` はプラグインID
- `name` はプラグイン名
- `enabled` はプラグインの有効/無効

### PluginsConfig

プラグイン設定の全体。

```typescript
type PluginsConfig = Readonly<{
  plugins: readonly PluginConfig[];
}>;
```

## ポート

### PluginConfigurator

kintoneアプリのプラグイン設定を取得・更新するためのインターフェース。

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
