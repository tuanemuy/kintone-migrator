# AppPermission ユースケース

## applyAppPermission

### 概要

ローカルの設定ファイル（app-acl.yaml）に定義されたアプリアクセス権をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルの `rights` が完全な望ましい状態を表現する。

### 入力DTO

なし

### 処理フロー

1. `AppPermissionStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"App permission config file not found"`）をスローする
2. `parseAppPermissionConfigText()`（内部で `AppPermissionConfigParser.parse()`）でアプリアクセス権設定をパースする
3. `AppPermissionConfigurator.getAppPermissions()` で現在のアクセス権とrevisionを取得する
4. `AppPermissionConfigurator.updateAppPermissions()` で設定の `rights` と現在のrevisionを渡して更新する

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
- `AppPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `AppPermissionConfigurator.getAppPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `AppPermissionConfigurator.updateAppPermissions()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureAppPermission

### 概要

kintoneアプリから現在のアプリアクセス権を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `AppPermissionConfigurator.getAppPermissions()` で現在のアクセス権を取得する
2. `AppPermissionConfigSerializer.serialize()` で設定オブジェクトに変換し、`stringifyConfig()` でYAML文字列にシリアライズする
3. `AppPermissionStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureAppPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからアプリアクセス権を取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `AppPermissionConfigurator.getAppPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `AppPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectAppPermissionDiff

### 概要

ローカルの設定ファイル（app-acl.yaml）とkintoneアプリのリモート設定を比較し、アプリアクセス権の差分を検出する。アクセス権はエンティティ（`type:code`）をキーとして追加・変更・削除を判定する（順序非依存）。

### 入力DTO

なし

### 処理フロー

1. `AppPermissionStorage.get()` と `AppPermissionConfigurator.getAppPermissions()` を並列で実行する
2. 設定ファイルが存在しない場合は `ValidationError(InvalidInput)`（`"App permission config file not found"`）をスローする
3. `parseAppPermissionConfigText()` でローカル設定をパースする
4. `AppPermissionDiffDetector.detect()` でローカルとリモートのアクセス権を比較し、差分を検出する
5. 差分結果を返す

### 出力DTO

```typescript
type AppPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  entityKey: string;
  details: string;
}>;

type AppPermissionDiff = DiffResult<AppPermissionDiffEntry>;
// DiffResult = { entries, summary: { added, modified, deleted, total }, isEmpty, warnings }
```

### テストケース

#### 正常系

- ローカルにのみ存在するエンティティの権限は `added` として検出される
- 両方に存在し権限フラグが異なる場合は `modified` として検出され、`details` に変更されたフラグ（appEditable, recordViewable など）が記述される
- リモートにのみ存在するエンティティの権限は `deleted` として検出される
- 差分がない場合、`isEmpty` が `true` になる
- 権限の並び順が異なるだけの場合は差分として検出されない（エンティティキーでの照合）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマット・構造が不正な場合、`ValidationError` がスローされる
- `AppPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `AppPermissionConfigurator.getAppPermissions()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveAppPermission

### 概要

アプリアクセス権設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveAppPermissionInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `AppPermissionStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### app-acl apply コマンド

`applyAppPermission` ユースケースをCLIから実行する。

- `AppPermissionStorage` → `LocalFileAppPermissionStorage`（ローカルYAMLファイル）
- `AppPermissionConfigurator` → `KintoneAppPermissionConfigurator`
- 設定ファイルパス → `--app-acl-file` / `APP_ACL_FILE_PATH` から取得（デフォルト: `app-acl/app-acl.yaml`）
- apply前に `detectAppPermissionDiff` で差分プレビューを表示する
- アクセス権反映後、`confirmAndDeploy` で運用環境への反映を確認する

### app-acl capture コマンド

`captureAppPermission` + `saveAppPermission` ユースケースをCLIから実行する。

- `AppPermissionStorage` → `LocalFileAppPermissionStorage`（ローカルYAMLファイル）
- `AppPermissionConfigurator` → `KintoneAppPermissionConfigurator`
- 設定ファイルパス → `--app-acl-file` / `APP_ACL_FILE_PATH` から取得（デフォルト: `app-acl/app-acl.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### app-acl diff コマンド

`detectAppPermissionDiff` ユースケースをCLIから実行する。

- `AppPermissionStorage` → `LocalFileAppPermissionStorage`（ローカルYAMLファイル）
- `AppPermissionConfigurator` → `KintoneAppPermissionConfigurator`
- 設定ファイルパス → `--app-acl-file` / `APP_ACL_FILE_PATH` から取得（デフォルト: `app-acl/app-acl.yaml`）
- `printAppPermissionDiffResult` で差分結果を整形して表示する
