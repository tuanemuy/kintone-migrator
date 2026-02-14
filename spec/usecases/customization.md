# Customization ユースケース

## applyCustomization

### 概要

ローカルの設定ファイル（customize.yaml）に定義されたJS/CSSリソースをkintoneアプリにアップロードし、カスタマイズ設定にマージ反映する。既存設定を保持するマージ方式を採用し、同名ファイルは更新、新規ファイルは追加、設定ファイルに含まれないリソースはそのまま保持する。

### 入力DTO

```typescript
type ApplyCustomizationInput = {
  basePath: string;
};
```

- `basePath`: FILEリソースのパス解決に使用するベースディレクトリ

### 処理フロー

1. `CustomizationStorage.get()` で設定テキストを取得する
2. `ConfigParser.parse()` でカスタマイズ設定をパースする
3. `CustomizationConfigurator.getCustomization()` で現在のカスタマイズ設定を取得する
4. 設定内のFILEリソースについて、`basePath` を基準にパスを解決し、`FileUploader.upload()` でアップロードする
5. アップロード結果から `ResolvedResource` を構築する
6. desktop/mobileの各js/cssについて `ResourceMerger.mergeResources()` で現在設定とマージする
7. マージ後のリソース合計数が各カテゴリ（desktop.js, desktop.css, mobile.js, mobile.css）で30を超えないかバリデーションする
8. `CustomizationConfigurator.updateCustomization()` でマージ結果を反映する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルにFILEリソースのみがある場合、ファイルがアップロードされカスタマイズ設定が更新される
- 設定ファイルにURLリソースのみがある場合、ファイルアップロードなしでカスタマイズ設定が更新される
- 設定ファイルにFILEとURLリソースが混在する場合、FILEのみアップロードされ両方がカスタマイズ設定に反映される
- scopeが指定されている場合、scopeも更新される
- scopeが省略されている場合、scopeは変更されない
- 既存設定に同名ファイルがある場合、新しいfileKeyで置換される
- 既存設定に同URLがある場合、置換される
- 既存設定に含まれないリソースは保持される
- desktop/mobileの設定が独立してマージされる
- 空のjs/css配列が指定された場合、既存リソースがすべて保持される

#### 異常系

- 設定テキストが空の場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- 設定テキストの構造が不正な場合、`ValidationError` がスローされる
- `CustomizationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `CustomizationConfigurator.getCustomization()` の通信に失敗した場合、`SystemError` がスローされる
- `FileUploader.upload()` の通信に失敗した場合、`SystemError` がスローされる
- `CustomizationConfigurator.updateCustomization()` の通信に失敗した場合、`SystemError` がスローされる
- マージ後のリソース数が30を超える場合、`BusinessRuleError(TooManyFiles)` がスローされる

---

## CLI実行コンテキスト

### customizeコマンド

`applyCustomization` ユースケースをCLIから実行する。

- `CustomizationStorage` → `LocalFileCustomizationStorage`（ローカルYAMLファイル）
- `CustomizationConfigurator` → `KintoneCustomizationConfigurator`
- `FileUploader` → `KintoneFileUploader`
- 設定ファイルパス → `--customize-file` / `CUSTOMIZE_FILE_PATH` から取得（デフォルト: `customize.yaml`）
- カスタマイズ反映後、`promptDeploy` で運用環境への反映を確認する
