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
5. 設定ファイルのプラグインを `enabled` とリモートの現状（`get-app-plugins` が返す `id`/`enabled`）に応じて振り分ける
   - `enabled: true` かつリモートに未追加のプラグイン → 追加対象（`add-app-plugins`）
   - `enabled: true` かつリモートに追加済みのプラグイン → 何もしない（冪等）
   - `enabled: false` かつリモートに未追加のプラグイン → **スキップし警告対象にする**（追加すると有効化されてしまうため追加しない。無効化は API 非対応で kintone の管理画面で手動対応が必要である旨を案内する）
   - `enabled: false` かつリモートに追加済み かつ リモートが `enabled: true`（無効化したいが API 非対応）のプラグイン → **スキップし警告対象にする**（無効化は反映できず手動対応が必要）
   - `enabled: false` かつリモートに追加済み かつ リモートが `enabled: false`（既に意図どおり）のプラグイン → 何もしない（過剰警告を避けるため警告対象にしない）
   - いずれの警告もエラーにはせず apply は継続する
6. 追加対象が1件以上ある場合、`PluginConfigurator.addPlugins()` でまとめて追加する（取得した `revision` を引き渡す）
7. 設定ファイルに存在しないリモートのプラグインは保持し、削除しない（マージ方式）

### 出力DTO

```typescript
type SkippedPlugin = {
  readonly pluginId: string;
  // disabled: enabled:false だが kintone プラグイン API では表現できない
  // （無効状態で追加する手段も既存プラグインを無効化する手段も無い）。
  // kintone 管理画面での手動対応が必要。
  readonly reason: "disabled";
};

type ApplyPluginOutput = {
  readonly addedPluginIds: readonly string[];
  readonly skipped: readonly SkippedPlugin[];
};
```

### テストケース

#### 正常系

- `enabled: true` でリモートに未追加のプラグインのみが `add-app-plugins` で追加される
- `enabled: true` で既にリモートに追加済みのプラグインは追加対象に含まれない（冪等）
- 追加対象が0件の場合、`addPlugins()` は呼ばれない
- 設定ファイルに存在しないリモートのプラグインは保持され、削除されない
- `enabled: false` かつリモート未追加のプラグインは追加されず、`skipped`（`reason: "disabled"`）として警告対象になる（apply 全体はエラーにならず継続する）
- `enabled: false` かつリモート追加済み かつ リモートが `enabled: true`（無効化意図・API 非対応）のプラグインは `skipped` として警告対象になる
- `enabled: false` かつリモート追加済み かつ リモートが `enabled: false`（既に意図どおり）のプラグインは過剰警告を避けるため `skipped` に含まれない
- capture で取り込んだ `enabled: false` のプラグインを apply しても、その無効化状態は再現されない（ラウンドトリップの非対称。API 制約として許容する）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `PluginStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginConfigurator.getPlugins()` の通信に失敗した場合、`SystemError` がスローされる
- `PluginConfigurator.addPlugins()` の通信に失敗した場合、`SystemError` がスローされる

> apply-all（`apply` コマンド）経由で plugin の apply が実行された場合も、`ApplyPluginOutput.skipped`（`enabled: false` の警告）はユーザーに表示される。apply-all は各ドメインの警告を集約する汎用の枠組み（`ApplyWarning`）に plugin の `skipped` を載せ、当該ドメインの結果行の直後に警告を表示する。警告はエラーではないため、success/failed/skipped の集計・デプロイ可否には影響しない。

---

## pushPlugin

### 概要

ローカルのプラグイン設定（plugins.yaml）を、base/local/remote の 3-way diff による drift 検出を経て kintone アプリに反映する。`applyPlugin` と同じ **add-only** の API 制約（無効化・削除・「無効状態での追加」に未対応）に従うため、反映できるのは `enabled: true` かつリモート未追加のプラグインの追加のみである。`enabled: false` 未追加分・リモート専用プラグインの削除・既追加プラグインの変更はいずれも反映できず、スキップして警告する（詳細は [spec/domains/plugin.md の「apply セマンティクスと制約」](../domains/plugin.md) を参照）。

### 入力DTO

```typescript
type PushPluginInput = {
  // drift チェックを行わず expected revision を送らない（revision-skip）。
  readonly force?: boolean;
};
```

### 処理フロー

1. base スナップショット（state）・local（設定ファイル）・remote（`get-app-plugins`）を取得する
2. local が存在しない場合、`ValidationError` をスローする
3. state が無い場合は firstTime（drift チェックを省略し expected revision を送らない）
4. firstTime でも force でもない場合、`computePluginThreeWayMerge` で drift（`remoteOnly` / `conflict`）を検出し、検出時は `ConflictError`（ConfigDrift）をスローする
5. local のプラグインのうちリモート未追加（`add-app-plugins` 対象候補）を `enabled` で振り分ける
   - `enabled: true` → 追加対象（`add-app-plugins`）
   - `enabled: false` → **スキップし警告対象にする**（`reason: "add-disabled"`。追加すると有効化されてしまうため追加しない。無効化は API 非対応で kintone 管理画面での手動対応が必要）
6. リモート専用（local に無い）プラグインは削除できないため `reason: "delete"` でスキップ＋警告する
7. 既にリモートに追加済みで `name`/`enabled` が異なるプラグインは変更できないため `reason: "modify"` でスキップ＋警告する
8. 追加対象が1件以上ある場合、`add-app-plugins` で追加する（通常 push では observed revision を TOCTOU ガードとして送り、force / firstTime では送らない）
9. base スナップショットを更新する。新 base = リモートの現状 + 実際に追加した `enabled: true` の id のみ。`add-disabled` でスキップした未追加分は base に含めない（次回 push で未追加 intent が再検出される）。`modify`/`delete` でスキップした分はリモートの値を保持する
10. いずれの警告もエラーにはせず push は継続する

### 出力DTO

```typescript
type SkippedPluginOp = {
  readonly pluginId: string;
  // delete: ローカルで削除されたがリモートに残存（add-only のため削除不可）。
  // modify: name/enabled をローカルで変更したが既にリモートに存在（更新不可・
  //   enabled は REST 非制御）。
  // add-disabled: ローカルで enabled:false かつリモート未追加。add-app-plugins
  //   は追加すると有効化してしまうため追加せず、無効化は管理画面で手動対応が必要。
  readonly reason: "delete" | "modify" | "add-disabled";
};

type PushPluginOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
  readonly addedPluginIds: readonly string[];
  readonly skipped: readonly SkippedPluginOp[];
};
```

### テストケース

#### 正常系

- `enabled: true` かつリモート未追加のプラグインのみが `add-app-plugins` の `ids` に渡る
- `enabled: false` かつリモート未追加のプラグインは `ids` に含まれず、`skipped`（`reason: "add-disabled"`）として警告対象になる（push 全体はエラーにならず継続する）
- `enabled: false` 未追加分をスキップしたとき、push 後の base スナップショットにそのプラグインを含めない（次回 push で再検出される）
- リモート専用プラグインは削除されず `skipped`（`reason: "delete"`）になり、base にはリモートの値が保持される
- 既追加プラグインの `name`/`enabled` 変更は反映されず `skipped`（`reason: "modify"`）になり、base にはリモートの値が保持される
- force / firstTime でも `enabled: false` 未追加分は追加されない（有効化もされない）
- 既にリモート追加済みの `enabled: false` は `modify`（または差分なしで無警告）で処理され、`add-disabled` に二重計上されない

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- drift（`remoteOnly` / `conflict`）を検出した場合、`ConflictError`（ConfigDrift）がスローされる（force 時は除く）
- `PluginConfigurator.getPlugins()` / `addPlugins()` の通信に失敗した場合、`SystemError` がスローされる

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
- apply はマージ（追加のみ）。`enabled: false` のプラグインは、リモート未追加（追加すると有効化されるため見送り）またはリモート追加済み×リモート `enabled: true`（無効化意図・API 非対応）の場合に警告対象としてスキップされ、kintone 管理画面での手動対応が必要である旨が表示される。リモートが既に `enabled: false`（意図どおり）の場合は過剰警告を避けるため警告しない
- 適用後、`confirmAndDeploy` で運用環境への反映（デプロイ）を確認する

### plugin pushコマンド

`pushPlugin` ユースケースをCLIから実行する。

- `PluginStorage` → ローカルYAMLファイルアダプター
- `PluginConfigurator` → kintone REST APIアダプター（`get-app-plugins` / `add-app-plugins`）
- `PluginStateStorage` / `AppRevisionStorage` → base スナップショット・revision の永続化アダプター
- 設定ファイルパス → `--plugin-file` / `PLUGIN_FILE_PATH` から取得（デフォルト: `plugins.yaml`、マルチアプリ: `plugin/<appName>.yaml`）
- base/local/remote の 3-way diff で drift を検出し、drift があれば `plugin pull` を促してエラー終了する（`--force` で drift チェックを省略）
- 反映は追加のみ。`enabled: true` かつリモート未追加のプラグインのみを追加する
- `enabled: false` かつリモート未追加のプラグインは追加せずスキップし、「無効状態での追加は kintone API 非対応（add-only。追加すると有効化される）・kintone 管理画面で手動対応が必要」という趣旨の警告（`reason: "add-disabled"`）を表示する
- リモート専用プラグインの削除（`reason: "delete"`）・既追加プラグインの `name`/`enabled` 変更（`reason: "modify"`）も反映できず、それぞれ専用の警告を表示する
- いずれの警告もエラーにはせず push は継続し、その後デプロイ確認に進む

### plugin captureコマンド

`capturePlugin` + `savePlugin` ユースケースをCLIから実行する。

- `PluginStorage` → ローカルYAMLファイルアダプター
- `PluginConfigurator` → kintone REST APIアダプター（`get-app-plugins`）
- 設定ファイルパス → `--plugin-file` / `PLUGIN_FILE_PATH` から取得（デフォルト: `plugins.yaml`、マルチアプリ: `plugin/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### plugin diffコマンド

`detectPluginDiff` ユースケースをCLIから実行し、ローカルとリモートの差分を表示する。
