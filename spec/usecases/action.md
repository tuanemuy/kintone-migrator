# Action ユースケース

## applyAction

### 概要

ローカルの設定ファイル（actions.yaml）に定義されたアクション設定をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルが完全な望ましい状態を表現する。設定ファイルに存在しないアクションはリモートからも削除される。

### 入力DTO

なし

### 処理フロー

1. `ActionStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError`（メッセージ: `Action config file not found`）をスローする
2. `parseActionConfigText()`（`ConfigCodec` でYAMLをパースし `ActionConfigParser.parse()` で検証）で `ActionsConfig` を得る
3. `ActionConfigurator.getActions()` で現在のアクション設定と `revision` を取得する
4. `ActionConfigurator.updateActions({ actions, revision })` でアクション設定を全置換更新する。取得した `revision` を渡すことで楽観的同時実行制御を行う

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルからアクション設定を読み込み、kintoneアプリに全置換で適用する
- `getActions()` で取得した現在の `revision` が `updateActions()` に渡される
- 設定ファイルに存在しないアクションはリモートから削除される（全置換）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Action config file not found`）がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- アクション設定の構造が不正な場合（`destApp` の `app`/`code` がいずれも未指定、`index` の重複、不正な `srcType` 等）、ドメインの `BusinessRuleError` が `ValidationError` に変換されてスローされる
- `ActionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ActionConfigurator.getActions()` の通信に失敗した場合、`SystemError` がスローされる
- `ActionConfigurator.updateActions()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureAction

### 概要

kintoneアプリから現在のアクション設定を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `ActionConfigurator.getActions()` で現在のアクション設定を取得する
2. `ActionConfigSerializer.serialize()` でシリアライズ用データに変換し、`ConfigCodec` でYAML文字列にシリアライズする
3. `ActionStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureActionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからアクション設定を取得し、YAML文字列にシリアライズする
- アクション名はマップのキーとして出力され、`name` プロパティは出力されない
- kintone API が返す `destApp`（`app`・`code`）はそのまま取り込まれる
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `ActionConfigurator.getActions()` の通信に失敗した場合、`SystemError` がスローされる
- `ActionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectActionDiff

### 概要

ローカルの設定ファイル（actions.yaml）に定義されたアクション設定とkintoneアプリのリモート設定を比較し、差分を検出する。apply 前のプレビューや `action diff` コマンドで利用する。

### 入力DTO

なし

### 処理フロー

1. `ActionStorage.get()` と `ActionConfigurator.getActions()` を並行実行し、ローカル設定テキストとリモート設定を取得する
2. ローカルファイルが存在しない場合は `ValidationError`（メッセージ: `Action config file not found`）をスローする
3. `parseActionConfigText()` でローカル設定テキストを `ActionsConfig` にパース・検証する
4. `ActionDiffDetector.detect(local, { actions: remote.actions })` で差分を検出する
5. `ActionDiff` を返す

### 出力DTO

```typescript
type ActionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  actionName: string;
  details: string;
}>;

type ActionDiff = DiffResult<ActionDiffEntry>;
// = Readonly<{
//   entries: readonly ActionDiffEntry[];
//   summary: { added; modified; deleted; total };
//   isEmpty: boolean;
//   warnings: readonly string[];
// }>
```

- ローカルにのみ存在するアクションは `added`、リモートにのみ存在するアクションは `deleted`、両方に存在し内容が異なるアクションは `modified` として分類される

### テストケース

#### 正常系

- ローカルとリモートのアクション設定を比較し、追加・変更・削除を検出する
- 差分がない場合、`isEmpty` が `true` になる
- `summary` に追加・変更・削除の件数が集計される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Action config file not found`）がスローされる
- 設定テキストのYAMLフォーマットまたは構造が不正な場合、`ValidationError` がスローされる
- `ActionStorage.get()` または `ActionConfigurator.getActions()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveAction

### 概要

アクション設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveActionInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `ActionStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### action apply コマンド

`detectActionDiff` で差分をプレビューし、確認のうえ `applyAction` ユースケースを実行する。

- `ActionStorage` → `LocalFileActionStorage`（ローカルYAMLファイル）
- `ActionConfigurator` → `KintoneActionConfigurator`
- 設定ファイルパス → `--action-file` / `ACTION_FILE_PATH` から取得（デフォルト: `actions.yaml`、マルチアプリ: `action/<appName>.yaml`）
- 適用前に `detectActionDiff` の結果を `printActionDiffResult` で表示し、適用を確認する
- アクション設定反映後、`confirmAndDeploy` で運用環境への反映を確認する

### action capture コマンド

`captureAction` + `saveAction` ユースケースをCLIから実行する。

- `ActionStorage` → `LocalFileActionStorage`（ローカルYAMLファイル）
- `ActionConfigurator` → `KintoneActionConfigurator`
- 設定ファイルパス → `--action-file` / `ACTION_FILE_PATH` から取得（デフォルト: `actions.yaml`、マルチアプリ: `action/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### action diff コマンド

`detectActionDiff` ユースケースをCLIから実行する。

- `ActionStorage` → `LocalFileActionStorage`（ローカルYAMLファイル）
- `ActionConfigurator` → `KintoneActionConfigurator`
- 設定ファイルパス → `--action-file` / `ACTION_FILE_PATH` から取得（デフォルト: `actions.yaml`、マルチアプリ: `action/<appName>.yaml`）
- 差分結果を `printActionDiffResult` で表示する
