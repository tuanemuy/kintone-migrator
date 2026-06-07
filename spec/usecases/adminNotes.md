# AdminNotes ユースケース

本ドメインは kintone の「アプリ管理者用メモ」機能（アプリ設定画面で管理者が編集できるメモ）を対象とする。管理者用メモは単一の設定値（シングルトン）であり、レポート・アクションのようなマップ（複数要素）ではない。

## applyAdminNotes

### 概要

ローカルの設定ファイル（admin-notes.yaml）に定義された管理者用メモをkintoneアプリに適用する。管理者用メモは単一の設定値であるため、設定ファイルの内容でリモートの管理者用メモを置き換える。

### 入力DTO

なし

### 処理フロー

1. `AdminNotesStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError`（メッセージ: `Admin notes config file not found`）をスローする
2. `parseAdminNotesConfigText()`（`ConfigCodec` でYAMLをパースし `AdminNotesConfigParser.parse()` で検証）で `AdminNotesConfig` を得る
3. `AdminNotesConfigurator.getAdminNotes()` で現在の管理者用メモと `revision` を取得する
4. `AdminNotesConfigurator.updateAdminNotes({ config, revision })` で管理者用メモを更新する。取得した `revision` を渡すことで楽観的同時実行制御を行う

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルから管理者用メモを読み込み、kintoneアプリに適用する
- `getAdminNotes()` で取得した現在の `revision` が `updateAdminNotes()` に渡される
- `content`（HTML）と `includeInTemplateAndDuplicates` がリモートに反映される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Admin notes config file not found`）がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- 設定の構造が不正な場合（オブジェクトでない、`content` 文字列または `includeInTemplateAndDuplicates` 真偽値を持たない等）、ドメインの `BusinessRuleError(AN_INVALID_CONFIG_STRUCTURE)` が `ValidationError` に変換されてスローされる
- `AdminNotesStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `AdminNotesConfigurator.getAdminNotes()` の通信に失敗した場合、`SystemError` がスローされる
- `AdminNotesConfigurator.updateAdminNotes()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureAdminNotes

### 概要

kintoneアプリから現在の管理者用メモを取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `AdminNotesConfigurator.getAdminNotes()` で現在の管理者用メモを取得する
2. `AdminNotesConfigSerializer.serialize(config)` でシリアライズ用データに変換し、`ConfigCodec` でYAML文字列にシリアライズする
3. `AdminNotesStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureAdminNotesOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリから管理者用メモを取得し、YAML文字列にシリアライズする
- `content` と `includeInTemplateAndDuplicates` が出力に含まれる
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `AdminNotesConfigurator.getAdminNotes()` の通信に失敗した場合、`SystemError` がスローされる
- `AdminNotesStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectAdminNotesDiff

### 概要

ローカルの設定ファイル（admin-notes.yaml）に定義された管理者用メモとkintoneアプリのリモート設定を比較し、差分を検出する。apply 前のプレビューや `admin-notes diff` コマンドで利用する。管理者用メモはシングルトンであり追加・削除の概念を持たないため、差分種別は `modified` のみとなる。

### 入力DTO

なし

### 処理フロー

1. `AdminNotesStorage.get()` と `AdminNotesConfigurator.getAdminNotes()` を並行実行し、ローカル設定テキストとリモート設定を取得する
2. ローカルファイルが存在しない場合は `ValidationError`（メッセージ: `Admin notes config file not found`）をスローする
3. `parseAdminNotesConfigText()` でローカル設定テキストを `AdminNotesConfig` にパース・検証する
4. `AdminNotesDiffDetector.detect(local, remote.config)` で差分を検出する
5. `AdminNotesDiff` を返す

### 出力DTO

```typescript
type AdminNotesDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

type AdminNotesDiff = DiffResult<AdminNotesDiffEntry>;
// = Readonly<{
//   entries: readonly AdminNotesDiffEntry[];
//   summary: { added; modified; deleted; total };
//   isEmpty: boolean;
//   warnings: readonly string[];
// }>
```

- `field` は差分のあったフィールド名（`content` または `includeInTemplateAndDuplicates`）
- `content` が異なる場合は前後の値を先頭30文字に切り詰めて要約した `modified` エントリを生成する
- 管理者用メモはシングルトンのため `summary.added` / `summary.deleted` は常に 0、`type` は `modified` のみ

### テストケース

#### 正常系

- ローカルとリモートの管理者用メモを比較し、`content` / `includeInTemplateAndDuplicates` の差分を検出する
- 差分がない場合、`isEmpty` が `true` になる
- `content` の長い値は先頭30文字へ切り詰めて要約される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Admin notes config file not found`）がスローされる
- 設定テキストのYAMLフォーマットまたは構造が不正な場合、`ValidationError` がスローされる
- `AdminNotesStorage.get()` または `AdminNotesConfigurator.getAdminNotes()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveAdminNotes

### 概要

管理者用メモ設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveAdminNotesInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `AdminNotesStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### admin-notes apply コマンド

`detectAdminNotesDiff` で差分をプレビューし、確認のうえ `applyAdminNotes` ユースケースを実行する。

- `AdminNotesStorage` → `LocalFileAdminNotesStorage`（ローカルYAMLファイル）
- `AdminNotesConfigurator` → `KintoneAdminNotesConfigurator`
- 設定ファイルパス → `--admin-notes-file` / `ADMIN_NOTES_FILE_PATH` から取得（デフォルト: `admin-notes.yaml`、マルチアプリ: `admin-notes/<appName>.yaml`）
- 適用前に `detectAdminNotesDiff` の結果を `printAdminNotesDiffResult` で表示し、適用を確認する
- 管理者用メモ反映後、`confirmAndDeploy` で運用環境への反映を確認する

### admin-notes capture コマンド

`captureAdminNotes` + `saveAdminNotes` ユースケースをCLIから実行する。

- `AdminNotesStorage` → `LocalFileAdminNotesStorage`（ローカルYAMLファイル）
- `AdminNotesConfigurator` → `KintoneAdminNotesConfigurator`
- 設定ファイルパス → `--admin-notes-file` / `ADMIN_NOTES_FILE_PATH` から取得（デフォルト: `admin-notes.yaml`、マルチアプリ: `admin-notes/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### admin-notes diff コマンド

`detectAdminNotesDiff` ユースケースをCLIから実行する。

- `AdminNotesStorage` → `LocalFileAdminNotesStorage`（ローカルYAMLファイル）
- `AdminNotesConfigurator` → `KintoneAdminNotesConfigurator`
- 設定ファイルパス → `--admin-notes-file` / `ADMIN_NOTES_FILE_PATH` から取得（デフォルト: `admin-notes.yaml`、マルチアプリ: `admin-notes/<appName>.yaml`）
- 差分結果を `printAdminNotesDiffResult` で表示する
