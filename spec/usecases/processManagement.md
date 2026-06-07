# ProcessManagement ユースケース

## applyProcessManagement

### 概要

ローカルの設定ファイル（process.yaml）に定義されたプロセス管理（ワークフロー）設定をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルが完全な望ましい状態を表現する。プロセス管理の有効/無効が切り替わる場合は、その旨を呼び出し元に通知できるよう結果を返す。

### 入力DTO

なし

### 処理フロー

1. `ProcessManagementStorage.get()` で設定テキストを取得する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `ProcessManagementConfigParser.parse()` でプロセス管理設定をパースする
4. `ProcessManagementConfigurator.getProcessManagement()` で現在の設定とrevisionを取得する
5. 現在の `enable` とローカルの `enable` を比較し、有効/無効が変化するかを判定する
6. `ProcessManagementConfigurator.updateProcessManagement()` で設定を更新する（取得した `revision` を引き渡し楽観的同時実行制御を行う）

### 出力DTO

```typescript
type ApplyProcessManagementOutput = {
  readonly enableChanged: boolean;
  readonly newEnable: boolean;
};
```

- `enableChanged` はプロセス管理の有効/無効が変化したかどうか
- `newEnable` は適用後のプロセス管理の有効/無効

### テストケース

#### 正常系

- 設定ファイルからプロセス管理設定を読み込み、kintoneアプリに適用する
- 現在のrevisionが更新リクエストに渡される
- `enable` が変化した場合、`enableChanged` が `true`、`newEnable` が適用後の値になる
- `enable` が変化しない場合、`enableChanged` が `false` になる

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `action.from`/`action.to` が `states` に存在しないステータスを参照する場合、`ValidationError`（ドメインの `BusinessRuleError(PM_INVALID_ACTION_REFERENCE)` をラップ）がスローされる
- アクション名が重複する場合、`ValidationError`（`BusinessRuleError(PM_DUPLICATE_ACTION_NAME)` をラップ）がスローされる
- `ProcessManagementStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ProcessManagementConfigurator.getProcessManagement()` の通信に失敗した場合、`SystemError` がスローされる
- `ProcessManagementConfigurator.updateProcessManagement()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureProcessManagement

### 概要

kintoneアプリから現在のプロセス管理設定を取得し、YAML形式でシリアライズしてファイルに保存できる状態にする。

### 入力DTO

なし

### 処理フロー

1. `ProcessManagementConfigurator.getProcessManagement()` で現在の設定を取得する
2. `ProcessManagementConfigSerializer.serialize()` でシリアライズ可能なオブジェクトに変換し、ConfigCodec でYAML文字列にする
3. `ProcessManagementStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureProcessManagementOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからプロセス管理設定を取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `ProcessManagementConfigurator.getProcessManagement()` の通信に失敗した場合、`SystemError` がスローされる
- `ProcessManagementStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectProcessManagementDiff

### 概要

永続化されたプロセス管理設定とリモートの現在の設定を比較し、差分を検出する。apply 実行前のプレビューや、`process diff` コマンドで利用される。

### 入力DTO

なし

### 処理フロー

1. `ProcessManagementStorage.get()` と `ProcessManagementConfigurator.getProcessManagement()` を並行して実行する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `ProcessManagementConfigParser.parse()` でローカル設定をパースする
4. `ProcessManagementDiffDetector.detect()` でローカルとリモートの差分を検出する
5. `ProcessManagementDiff` を返す

### 出力DTO

```typescript
type ProcessManagementDiffEntry = {
  readonly type: "added" | "modified" | "deleted";
  readonly category: "enable" | "state" | "action";
  readonly name: string;
  readonly details: string;
};

type ProcessManagementDiff = {
  readonly entries: readonly ProcessManagementDiffEntry[];
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
- `enable`・ステータス・アクションの追加/変更/削除が `entries` に分類される
- `summary` に追加/変更/削除の件数と合計が集計される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `ProcessManagementStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ProcessManagementConfigurator.getProcessManagement()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveProcessManagement

### 概要

プロセス管理設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveProcessManagementInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `ProcessManagementStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定テキストをストレージに保存する

#### 異常系

- `ProcessManagementStorage.update()` のファイル操作に失敗した場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

### process applyコマンド

`detectProcessManagementDiff` → `applyProcessManagement` ユースケースをCLIから実行する。

- `ProcessManagementStorage` → ローカルYAMLファイルアダプター
- `ProcessManagementConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--process-file` / `PROCESS_FILE_PATH` から取得（デフォルト: `process.yaml`、マルチアプリ: `process/<appName>.yaml`）
- 適用前に `detectProcessManagementDiff` で差分プレビューを表示し、差分がなければ何もしない。差分がある場合は確認プロンプト（`--yes` でスキップ可）の後に適用する
- `enableChanged` が `true` の場合、プロセス管理が有効化/無効化される旨を警告表示する
- 適用後、`confirmAndDeploy` で運用環境への反映（デプロイ）を確認する

### process captureコマンド

`captureProcessManagement` + `saveProcessManagement` ユースケースをCLIから実行する。

- `ProcessManagementStorage` → ローカルYAMLファイルアダプター
- `ProcessManagementConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--process-file` / `PROCESS_FILE_PATH` から取得（デフォルト: `process.yaml`、マルチアプリ: `process/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### process diffコマンド

`detectProcessManagementDiff` ユースケースをCLIから実行し、ローカルとリモートの差分を表示する。
