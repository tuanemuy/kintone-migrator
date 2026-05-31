# GeneralSettings ユースケース

## applyGeneralSettings

### 概要

ローカルの設定ファイル（settings.yaml）に定義されたアプリの一般設定をkintoneアプリに適用する。kintone の update-app-settings API がトップレベルのキー単位で部分更新に対応しているため、設定ファイルに記述された（`undefined` でない）プロパティのみが更新対象となる部分更新方式を採用する。

### 入力DTO

なし

### 処理フロー

1. `GeneralSettingsStorage.get()` で設定テキストを取得する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `GeneralSettingsConfigParser.parse()` で一般設定をパースする
4. `GeneralSettingsConfigurator.getGeneralSettings()` で現在の設定とrevisionを取得する
5. `GeneralSettingsConfigurator.updateGeneralSettings()` で設定を部分更新する（取得した `revision` を引き渡し楽観的同時実行制御を行う）

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルから一般設定を読み込み、kintoneアプリに適用する
- 現在のrevisionが更新リクエストに渡される
- 設定ファイルに記述されたプロパティのみが更新リクエストに含まれる（未記述プロパティはリモート値を保持し、リクエストに含めない）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `firstMonthOfFiscalYear` が整数でない・範囲外（1〜12以外）の場合、`ValidationError`（ドメインの `BusinessRuleError(GS_INVALID_CONFIG_STRUCTURE)` をラップ）がスローされる
- `GeneralSettingsStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `GeneralSettingsConfigurator.getGeneralSettings()` の通信に失敗した場合、`SystemError` がスローされる
- `GeneralSettingsConfigurator.updateGeneralSettings()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureGeneralSettings

### 概要

kintoneアプリから現在のアプリ一般設定を取得し、YAML形式でシリアライズしてファイルに保存できる状態にする。

### 入力DTO

なし

### 処理フロー

1. `GeneralSettingsConfigurator.getGeneralSettings()` で現在の設定を取得する
2. `GeneralSettingsConfigSerializer.serialize()` でシリアライズ可能なオブジェクトに変換し、ConfigCodec でYAML文字列にする
3. `GeneralSettingsStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureGeneralSettingsOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリから一般設定を取得し、YAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `GeneralSettingsConfigurator.getGeneralSettings()` の通信に失敗した場合、`SystemError` がスローされる
- `GeneralSettingsStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectGeneralSettingsDiff

### 概要

永続化された一般設定とリモートの現在の設定を比較し、差分を検出する。apply 実行前のプレビューや、`settings diff` コマンドで利用される。一般設定はシングルトン設定であり、追加/削除の概念がないため、差分は `modified` のみで表現される。

### 入力DTO

なし

### 処理フロー

1. `GeneralSettingsStorage.get()` と `GeneralSettingsConfigurator.getGeneralSettings()` を並行して実行する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `GeneralSettingsConfigParser.parse()` でローカル設定をパースする
4. `GeneralSettingsDiffDetector.detect()` でローカルとリモートの差分を検出する
5. `GeneralSettingsDiff` を返す

### 出力DTO

```typescript
type GeneralSettingsDiffEntry = {
  readonly type: "modified";
  readonly field: string;
  readonly details: string;
};

type GeneralSettingsDiff = {
  readonly entries: readonly GeneralSettingsDiffEntry[];
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
- 設定ファイルに記述されたプロパティの変更のみが `modified` として `entries` に含まれる
- 設定ファイルに記述されていないプロパティはリモート値との差分として扱われない

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `GeneralSettingsStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `GeneralSettingsConfigurator.getGeneralSettings()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveGeneralSettings

### 概要

一般設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveGeneralSettingsInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `GeneralSettingsStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定テキストをストレージに保存する

#### 異常系

- `GeneralSettingsStorage.update()` のファイル操作に失敗した場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

### settings applyコマンド

`detectGeneralSettingsDiff` → `applyGeneralSettings` ユースケースをCLIから実行する。

- `GeneralSettingsStorage` → ローカルYAMLファイルアダプター
- `GeneralSettingsConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--settings-file` / `SETTINGS_FILE_PATH` から取得（デフォルト: `settings.yaml`、マルチアプリ: `settings/<appName>.yaml`）
- 適用前に `detectGeneralSettingsDiff` で差分プレビューを表示し、差分がなければ何もしない。差分がある場合は確認プロンプト（`--yes` でスキップ可）の後に適用する
- 適用後、`confirmAndDeploy` で運用環境への反映（デプロイ）を確認する

### settings captureコマンド

`captureGeneralSettings` + `saveGeneralSettings` ユースケースをCLIから実行する。

- `GeneralSettingsStorage` → ローカルYAMLファイルアダプター
- `GeneralSettingsConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--settings-file` / `SETTINGS_FILE_PATH` から取得（デフォルト: `settings.yaml`、マルチアプリ: `settings/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### settings diffコマンド

`detectGeneralSettingsDiff` ユースケースをCLIから実行し、ローカルとリモートの差分を表示する。
