# RecordPermission ユースケース

## applyRecordPermission

### 概要

ローカルの設定ファイル（record-acl.yaml）に定義されたレコードアクセス権をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルの `rights` が完全な望ましい状態を表現する。

### 入力DTO

なし

### 処理フロー

1. `RecordPermissionStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"Record permission config file not found"`）をスローする
2. `parseRecordPermissionConfigText()`（内部で `RecordPermissionConfigParser.parse()`）でレコードアクセス権設定をパースする
3. `RecordPermissionConfigurator.getRecordPermissions()` で現在のアクセス権とrevisionを取得する
4. `RecordPermissionConfigurator.updateRecordPermissions()` で設定の `rights` と現在のrevisionを渡して更新する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルからアクセス権を読み込み、kintoneアプリに適用する
- 現在のrevisionが更新リクエストに渡される
- 設定ファイルの `rights` がそのまま更新リクエストの `rights` として渡される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- 設定テキストの構造が不正な場合、`ValidationError` がスローされる
- `RecordPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `RecordPermissionConfigurator.getRecordPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `RecordPermissionConfigurator.updateRecordPermissions()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureRecordPermission

### 概要

kintoneアプリから現在のレコードアクセス権を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `RecordPermissionConfigurator.getRecordPermissions()` で現在のアクセス権を取得する
2. `RecordPermissionConfigSerializer.serialize()` で設定オブジェクトに変換し、`stringifyConfig()` でYAML文字列にシリアライズする
3. `RecordPermissionStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureRecordPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからレコードアクセス権を取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `RecordPermissionConfigurator.getRecordPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `RecordPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectRecordPermissionDiff

### 概要

ローカルの設定ファイル（record-acl.yaml）とkintoneアプリのリモート設定を比較し、レコードアクセス権の差分を検出する。アクセス権は `filterCond`（フィルター条件）でグループ化し、グループ内では位置（インデックス）で照合する（グループ内は順序依存、グループ間は順序非依存）。

### 入力DTO

なし

### 処理フロー

1. `RecordPermissionStorage.get()` と `RecordPermissionConfigurator.getRecordPermissions()` を並列で実行する
2. 設定ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"Record permission config file not found"`）をスローする
3. `parseRecordPermissionConfigText()` でローカル設定をパースする
4. `RecordPermissionDiffDetector.detect()` でローカルとリモートのアクセス権を比較し、差分を検出する
5. 差分結果を返す

### 出力DTO

```typescript
type RecordPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  filterCond: string;
  details: string;
}>;

type RecordPermissionDiff = DiffResult<RecordPermissionDiffEntry>;
// DiffResult = { entries, summary: { added, modified, deleted, total }, isEmpty, warnings }
```

### テストケース

#### 正常系

- ローカルにのみ存在する `filterCond` の権限は `added` として検出される
- 同一 `filterCond` 内でローカルにのみ存在する位置の権限は `added` として検出される
- 同一 `filterCond` 内の同一位置で内容（エンティティ・権限フラグ）が異なる場合は `modified` として検出され、`details` にエンティティ数の変化または権限内容の変化が記述される
- リモートにのみ存在する `filterCond` の権限は `deleted` として検出される
- 差分がない場合、`isEmpty` が `true` になる

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマット・構造が不正な場合、`ValidationError` がスローされる
- `RecordPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `RecordPermissionConfigurator.getRecordPermissions()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveRecordPermission

### 概要

レコードアクセス権設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveRecordPermissionInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `RecordPermissionStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### record-acl apply コマンド

`applyRecordPermission` ユースケースをCLIから実行する。

- `RecordPermissionStorage` → `LocalFileRecordPermissionStorage`（ローカルYAMLファイル）
- `RecordPermissionConfigurator` → `KintoneRecordPermissionConfigurator`
- 設定ファイルパス → `--record-acl-file` / `RECORD_ACL_FILE_PATH` から取得（デフォルト: `record-acl/record-acl.yaml`）
- apply前に `detectRecordPermissionDiff` で差分プレビューを表示する
- アクセス権反映後、`confirmAndDeploy` で運用環境への反映を確認する

### record-acl capture コマンド

`captureRecordPermission` + `saveRecordPermission` ユースケースをCLIから実行する。

- `RecordPermissionStorage` → `LocalFileRecordPermissionStorage`（ローカルYAMLファイル）
- `RecordPermissionConfigurator` → `KintoneRecordPermissionConfigurator`
- 設定ファイルパス → `--record-acl-file` / `RECORD_ACL_FILE_PATH` から取得（デフォルト: `record-acl/record-acl.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### record-acl diff コマンド

`detectRecordPermissionDiff` ユースケースをCLIから実行する。

- `RecordPermissionStorage` → `LocalFileRecordPermissionStorage`（ローカルYAMLファイル）
- `RecordPermissionConfigurator` → `KintoneRecordPermissionConfigurator`
- 設定ファイルパス → `--record-acl-file` / `RECORD_ACL_FILE_PATH` から取得（デフォルト: `record-acl/record-acl.yaml`）
- `printRecordPermissionDiffResult` で差分結果を整形して表示する
