# Plugin ユースケース

## applyPlugin

### 概要

ローカルの設定ファイル（plugins.yaml）に定義されたプラグイン設定をkintoneアプリに適用する。kintone REST API はプラグインについて取得（`get-app-plugins`）と追加（`add-app-plugins`）の2操作のみを提供し、**無効化・削除に対応するエンドポイントが存在しない**。この API 制約により、apply の反映方式は他ドメインのような全置換ではなく**マージ（追加のみ）**となる（詳細は [spec/domains/plugin.md の「apply セマンティクスと制約」](../domains/plugin.md) を参照）。

### 入力DTO

なし

### 処理フロー

1. `PluginStorage.get()` で設定テキストを取得する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `PluginConfigParser.parse()` でプラグイン設定をパースする
4. `PluginConfigurator.getPlugins()` で現在のプラグイン一覧とrevisionを取得する
5. 設定ファイルのプラグインを `enabled` に応じて振り分ける
   - `enabled: true` かつリモートに未追加のプラグイン → 追加対象（`add-app-plugins`）
   - `enabled: true` かつリモートに追加済みのプラグイン → 何もしない（冪等）
   - `enabled: false` のプラグイン → **スキップし警告を出力する**（無効化は API 非対応のため、kintone の管理画面で手動対応が必要である旨を案内する。エラーにはしない）
6. 追加対象が1件以上ある場合、`PluginConfigurator.addPlugins()` でまとめて追加する（取得した `revision` を引き渡す）
7. 設定ファイルに存在しないリモートのプラグインは保持し、削除しない（マージ方式）

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- `enabled: true` でリモートに未追加のプラグインのみが `add-app-plugins` で追加される
- `enabled: true` で既にリモートに追加済みのプラグインは追加対象に含まれない（冪等）
- 追加対象が0件の場合、`addPlugins()` は呼ばれない
- 設定ファイルに存在しないリモートのプラグインは保持され、削除されない
- `enabled: false` のプラグインはスキップされ、無効化は手動対応が必要である旨の警告が出力される（apply 全体はエラーにならず継続する）
- capture で取り込んだ `enabled: false` のプラグインを apply しても、その無効化状態は再現されない（ラウンドトリップの非対称。API 制約として許容する）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `PluginStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginConfigurator.getPlugins()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginConfigurator.addPlugins()` の通信に失敗した場合、`SystemError` がスローされる

---

## capturePlugin

### 概要

kintoneアプリから現在のプラグイン一覧を取得し、YAML形式でシリアライズしてファイルに保存できる状態にする。`get-app-plugins` が返す実際の有効/無効状態（`enabled`）を忠実に記録する。

### 入力DTO

なし

### 処理フロー

1. `PluginConfigurator.getPlugins()` で現在のプラグイン一覧を取得する
2. `PluginConfigSerializer.serialize()` でシリアライズ可能なオブジェクトに変換し、ConfigCodec でYAML文字列にする
3. `PluginStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CapturePluginOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからプラグイン一覧を取得し、`id`・`name`・`enabled` を含むYAML文字列にシリアライズする
- リモートの `enabled: false` のプラグインも忠実に記録される（ただし apply では再現できない点に注意）
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `PluginConfigurator.getPlugins()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectPluginDiff

### 概要

永続化されたプラグイン設定とリモートの現在のプラグイン一覧を比較し、差分を検出する。apply 実行前のプレビューや、`plugin diff` コマンドで利用される。

### 入力DTO

なし

### 処理フロー

1. `PluginStorage.get()` と `PluginConfigurator.getPlugins()` を並行して実行する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `PluginConfigParser.parse()` でローカル設定をパースする
4. `PluginDiffDetector.detect()` でローカルとリモートの差分を検出する
5. `PluginDiff` を返す

### 出力DTO

```typescript
type PluginDiffEntry = {
  readonly type: "added" | "modified" | "deleted";
  readonly pluginId: string;
  readonly details: string;
};

type PluginDiff = {
  readonly entries: readonly PluginDiffEntry[];
  readonly summary: {
    readonly added: number;
    readonly modified: number;
    readonly deleted: number;
    readonly total: number;
  };
  readonly isEmpty: boolean;
  readonly warnings: readonly string[];
};
```

### テストケース

#### 正常系

- ローカルとリモートに差分がない場合、`isEmpty` が `true` になる
- プラグインの追加/変更/削除が `pluginId` 付きで `entries` に分類される
- `summary` に追加/変更/削除の件数と合計が集計される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `PluginStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginConfigurator.getPlugins()` の通信に失敗した場合、`SystemError` がスローされる

---

## savePlugin

### 概要

プラグイン設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SavePluginInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `PluginStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定テキストをストレージに保存する

#### 異常系

- `PluginStorage.update()` のファイル操作に失敗した場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

### plugin applyコマンド

`detectPluginDiff` → `applyPlugin` ユースケースをCLIから実行する。

- `PluginStorage` → ローカルYAMLファイルアダプター
- `PluginConfigurator` → kintone REST APIアダプター（`get-app-plugins` / `add-app-plugins`）
- 設定ファイルパス → `--plugin-file` / `PLUGIN_FILE_PATH` から取得（デフォルト: `plugins.yaml`、マルチアプリ: `plugin/<appName>.yaml`）
- 適用前に `detectPluginDiff` で差分プレビューを表示し、差分がなければ何もしない。差分がある場合は確認プロンプト（`--yes` でスキップ可）の後に適用する
- apply はマージ（追加のみ）。`enabled: false` のプラグインはスキップされ、無効化が手動対応である旨の警告が表示される
- 適用後、`confirmAndDeploy` で運用環境への反映（デプロイ）を確認する

### plugin captureコマンド

`capturePlugin` + `savePlugin` ユースケースをCLIから実行する。

- `PluginStorage` → ローカルYAMLファイルアダプター
- `PluginConfigurator` → kintone REST APIアダプター（`get-app-plugins`）
- 設定ファイルパス → `--plugin-file` / `PLUGIN_FILE_PATH` から取得（デフォルト: `plugins.yaml`、マルチアプリ: `plugin/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### plugin diffコマンド

`detectPluginDiff` ユースケースをCLIから実行し、ローカルとリモートの差分を表示する。
