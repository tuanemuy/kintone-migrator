# プラグイン設定ファイル仕様

プラグインの有効/無効設定の設定ファイルフォーマット。

## kintone API リファレンス

- [アプリに追加されているプラグインの一覧を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-plugins/)
- [アプリにプラグインを追加する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/add-app-plugins/)

> **制約**: kintone REST API にはプラグインの**無効化・削除、および「無効状態での追加」に対応するエンドポイントが存在しない**（`add-app-plugins` は追加すると有効化される）。そのため apply は `id` ベースの追加（マージ）のみで、`enabled: true` の未追加プラグインを追加し、`enabled: false` はスキップ＋警告する（無効化は UI 手動対応が必要）。`enabled` は capture / diff / serialize では保持・表示される。詳細は [Plugin ドメイン仕様](../domains/plugin.md) の「apply セマンティクスと制約」を参照。

## フォーマット

YAML形式で記述する。

```yaml
plugins:
  - id: djmhffjlbojgcbnahicgdjiahbegolkj
    name: 条件分岐プラグイン
    enabled: true
  - id: pafgcfghlmjicbadmkohfoihfkblahhe
    name: カレンダーPlusプラグイン
    enabled: true
  - id: kintone-plugin-example-id
    name: テスト用プラグイン
    enabled: false
```

## フィールド定義

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `plugins` | 必須 | プラグイン定義の配列 |
| `plugins[].id` | 必須 | プラグインID |
| `plugins[].name` | 必須 | プラグイン名（可読性のための記録用。apply の判定には `id` を使用） |
| `plugins[].enabled` | 必須 | プラグインの有効/無効。capture / diff / serialize では保持・表示される。apply では `enabled: true` の未追加プラグインのみを追加し、**`enabled: false` はスキップ＋警告**する（kintone は無効状態での追加ができず、追加すると有効化されてしまうため）。`enabled: true → false`（無効化）や `enabled` 変更の反映は API 非対応のため行えない。省略時は `true`、boolean 以外はエラー。 |

## バリデーション

パース時に以下を検証する。詳細は [Plugin ドメイン仕様](../domains/plugin.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `PL_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`plugins` が配列でない、要素の型不一致 等） |
| `PL_EMPTY_PLUGIN_ID` | `plugins[].id` が空文字 |
| `PL_DUPLICATE_PLUGIN_ID` | 同一の `id` を持つプラグインが複数存在する |

## エラーコード

| 定数 | コード |
| --- | --- |
| `PlInvalidConfigStructure` | `PL_INVALID_CONFIG_STRUCTURE` |
| `PlEmptyPluginId` | `PL_EMPTY_PLUGIN_ID` |
| `PlDuplicatePluginId` | `PL_DUPLICATE_PLUGIN_ID` |
