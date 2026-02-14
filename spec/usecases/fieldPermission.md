# FieldPermission ユースケース

## applyFieldPermission

### 概要

ローカルの設定ファイル（field-acl.yaml）に定義されたフィールドアクセス権をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルが完全な望ましい状態を表現する。

### 入力DTO

なし

### 処理フロー

1. `FieldPermissionStorage.get()` で設定テキストを取得する
2. `FieldPermissionConfigParser.parse()` でフィールドアクセス権設定をパースする
3. `FieldPermissionConfigurator.getFieldPermissions()` で現在のアクセス権とrevisionを取得する
4. `FieldPermissionConfigurator.updateFieldPermissions()` でアクセス権を更新する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルからアクセス権を読み込み、kintoneアプリに適用する
- 現在のrevisionが更新リクエストに渡される

#### 異常系

- 設定テキストが空の場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `FieldPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `FieldPermissionConfigurator.getFieldPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `FieldPermissionConfigurator.updateFieldPermissions()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureFieldPermission

### 概要

kintoneアプリから現在のフィールドアクセス権を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `FieldPermissionConfigurator.getFieldPermissions()` で現在のアクセス権を取得する
2. `FieldPermissionConfigSerializer.serialize()` でYAML文字列にシリアライズする
3. `FieldPermissionStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureFieldPermissionOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからフィールドアクセス権を取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `FieldPermissionConfigurator.getFieldPermissions()` の通信に失敗した場合、`SystemError` がスローされる
- `FieldPermissionStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveFieldPermission

### 概要

フィールドアクセス権設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveFieldPermissionInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `FieldPermissionStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### field-aclコマンド

`applyFieldPermission` ユースケースをCLIから実行する。

- `FieldPermissionStorage` → `LocalFileFieldPermissionStorage`（ローカルYAMLファイル）
- `FieldPermissionConfigurator` → `KintoneFieldPermissionConfigurator`
- 設定ファイルパス → `--field-acl-file` / `FIELD_ACL_FILE_PATH` から取得（デフォルト: `field-acl.yaml`）
- アクセス権反映後、`promptDeploy` で運用環境への反映を確認する

### capture-field-aclコマンド

`captureFieldPermission` + `saveFieldPermission` ユースケースをCLIから実行する。

- `FieldPermissionStorage` → `LocalFileFieldPermissionStorage`（ローカルYAMLファイル）
- `FieldPermissionConfigurator` → `KintoneFieldPermissionConfigurator`
- 設定ファイルパス → `--field-acl-file` / `FIELD_ACL_FILE_PATH` から取得（デフォルト: `field-acl.yaml`）
- 既存ファイルがある場合、上書き警告を表示する
