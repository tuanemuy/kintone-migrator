# View ユースケース

## applyView

### 概要

ローカルの設定ファイル（views.yaml）に定義されたビュー設定をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルが完全な望ましい状態を表現する。ただしビルトインビュー（`builtinType` を持つビュー）はkintoneのシステム管理対象であるため、置換対象から除外し、リモートに存在するビルトインビューは保持する。

### 入力DTO

なし

### 処理フロー

1. `ViewStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"View config file not found"`）をスローする
2. `parseViewConfigText()`（内部で `ViewConfigParser.parse()`）でビュー設定をパースする
3. ローカル設定のビューを走査し、`builtinType` を持つビューはスキップ対象（`skippedBuiltinViews`）として記録し、それ以外を適用対象（`filteredViews`）に振り分ける
4. `ViewConfigurator.getViews()` で現在のビューとrevisionを取得する
5. リモートのビルトインビューのうち、ローカルに同名ビューが存在しないものを `filteredViews` にマージして保持する
6. `ViewConfigurator.updateViews()` で `filteredViews` と現在のrevisionを渡して更新する

### 出力DTO

```typescript
type ApplyViewOutput = {
  readonly skippedBuiltinViews: readonly string[];
};
```

- `skippedBuiltinViews`: ローカル設定に含まれていたが適用をスキップしたビルトインビュー名の一覧

### テストケース

#### 正常系

- 設定ファイルからビューを読み込み、kintoneアプリに適用する
- 現在のrevisionが更新リクエストに渡される
- ローカルにビルトインビューが含まれる場合、それらは適用されず `skippedBuiltinViews` に記録される
- リモートにのみ存在するビルトインビューは、更新リクエストに保持される
- ローカルの非ビルトインビューがリモートのビルトインビューと同名の場合、ローカルのビューが優先される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- 設定テキストの構造が不正な場合、`ValidationError` がスローされる
- `ViewStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ViewConfigurator.getViews()` の通信に失敗した場合、`SystemError` がスローされる
- `ViewConfigurator.updateViews()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureView

### 概要

kintoneアプリから現在のビュー設定を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `ViewConfigurator.getViews()` で現在のビューを取得する
2. `ViewConfigSerializer.serialize()` で設定オブジェクトに変換し、`stringifyConfig()` でYAML文字列にシリアライズする
3. `ViewStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureViewOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからビューを取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `ViewConfigurator.getViews()` の通信に失敗した場合、`SystemError` がスローされる
- `ViewStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectViewDiff

### 概要

ローカルの設定ファイル（views.yaml）とkintoneアプリのリモート設定を比較し、ビューの差分を検出する。ビューは名前をキーとして追加・変更・削除を判定する。

### 入力DTO

なし

### 処理フロー

1. `ViewStorage.get()` と `ViewConfigurator.getViews()` を並列で実行する
2. 設定ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"View config file not found"`）をスローする
3. `parseViewConfigText()` でローカル設定をパースし、`views` を取り出す
4. `ViewDiffDetector.detect()` でローカルとリモートのビューを比較し、差分を検出する
5. 差分結果を返す

### 出力DTO

```typescript
type ViewDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  viewName: string;
  details: string;
}>;

type ViewDiff = DiffResult<ViewDiffEntry>;
// DiffResult = { entries, summary: { added, modified, deleted, total }, isEmpty, warnings }
```

### テストケース

#### 正常系

- ローカルにのみ存在するビューは `added` として検出される
- 両方に存在し内容が異なるビューは `modified` として検出され、`details` に変更点（type, index, fields など）が記述される
- リモートにのみ存在するビューは `deleted` として検出される
- 差分がない場合、`isEmpty` が `true` になる
- `builtinType` はリモートが空文字、ローカルが未定義でも同一とみなされる

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマット・構造が不正な場合、`ValidationError` がスローされる
- `ViewStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ViewConfigurator.getViews()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveView

### 概要

ビュー設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveViewInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `ViewStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### view apply コマンド

`applyView` ユースケースをCLIから実行する。

- `ViewStorage` → `LocalFileViewStorage`（ローカルYAMLファイル）
- `ViewConfigurator` → `KintoneViewConfigurator`
- 設定ファイルパス → `--view-file` / `VIEW_FILE_PATH` から取得（デフォルト: `view/views.yaml`）
- apply前に `detectViewDiff` で差分プレビューを表示する
- `skippedBuiltinViews` がある場合、警告としてスキップしたビュー名を表示する
- ビュー反映後、`confirmAndDeploy` で運用環境への反映を確認する

### view capture コマンド

`captureView` + `saveView` ユースケースをCLIから実行する。

- `ViewStorage` → `LocalFileViewStorage`（ローカルYAMLファイル）
- `ViewConfigurator` → `KintoneViewConfigurator`
- 設定ファイルパス → `--view-file` / `VIEW_FILE_PATH` から取得（デフォルト: `view/views.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### view diff コマンド

`detectViewDiff` ユースケースをCLIから実行する。

- `ViewStorage` → `LocalFileViewStorage`（ローカルYAMLファイル）
- `ViewConfigurator` → `KintoneViewConfigurator`
- 設定ファイルパス → `--view-file` / `VIEW_FILE_PATH` から取得（デフォルト: `view/views.yaml`）
- `printViewDiffResult` で差分結果を整形して表示する
