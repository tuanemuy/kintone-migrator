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

## captureCustomization

### 概要

kintoneアプリの現在のカスタマイズ設定（scope / desktop / mobile）を取得し、FILEリソースの実体をローカルへダウンロードしつつ、設定ファイル（YAML）テキストを生成する。設定テキストの永続化は行わず、生成結果を呼び出し側へ返す（保存は `saveCustomization` の責務）。

### 入力DTO

```typescript
type CaptureCustomizationInput = {
  readonly basePath: string;
  readonly filePrefix: string;
};
```

- `basePath`: ダウンロードファイルおよび設定ファイルのベースディレクトリ
- `filePrefix`: ダウンロードファイルの保存先を分離するためのプレフィックス（マルチアプリ構成でアプリごとにファイルを隔離する。空文字の場合はプレフィックスなし）

### 処理フロー

1. `CustomizationStorage.get()` で既存設定の有無を確認する（ファイルをダウンロードする前に確認し、呼び出し側が早期に上書き判断できるようにする）
2. `CustomizationConfigurator.getCustomization()` で現在の設定（scope / desktop / mobile）を取得する
3. Phase 1（I/Oなし）: リモートの各FILEリソースについて保存パスを計画し、ローカルパスを指す `CustomizationConfig` を組み立てる
4. `CustomizationConfigSerializer.serialize()` で設定オブジェクトを生成し、`stringifyConfig()` でYAML文字列化する
5. Phase 2: `FileDownloader.download()` で各FILEの実体を取得し、`FileWriter.write()` で計画したパスへ書き込む（全プラットフォーム・カテゴリのファイルを並行実行）
6. 設定テキスト・既存設定の有無・FILEリソース件数を返す

#### FILEリソースの保存パス規則

- 保存ルート（絶対パス）は `basePath/filePrefix/{platform}/{js|css}/{fileName}`（`platform` は `desktop` / `mobile`）
- 設定ファイルへ書き出す `path` は `filePrefix` を含まない相対パス `{platform}/{js|css}/{fileName}`

#### ファイル名の衝突解決

- ファイル名はリモートのファイル名の basename を採用し、サニタイズする（`< > : " | ? *` および制御文字を `_` に置換。`""` / `.` / `..` は `_` にする）
- 同一プラットフォーム・カテゴリ内でファイル名が衝突する場合は、拡張子の前に連番を挿入して一意化する（例: `app.js` → `app_1.js`）

#### 部分失敗時の方針

ダウンロード途中で失敗しても書き込み済みファイルはディスク上に残るが、リトライは冪等（上書き）であり、設定YAMLの永続化は本処理の成功後に呼び出し側（`saveCustomization`）が行うため、設定とファイルの不整合は生じない。

### 出力DTO

```typescript
type CaptureCustomizationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
  readonly fileResourceCount: number;
};
```

- `configText`: 生成されたYAML設定テキスト
- `hasExistingConfig`: 設定ファイルが既に存在するか（上書き警告の判断に使用）
- `fileResourceCount`: ダウンロード対象となったFILEリソースの件数

### テストケース

#### 正常系

- リモート設定を取得し、scope / desktop / mobile を含むYAML設定テキストを生成する
- FILEリソースがダウンロードされ、計画した保存パスへ書き込まれる
- URLリソースのみの場合、ダウンロードなしで設定テキストが生成される（`fileResourceCount` が 0）
- desktop/mobile の js/css がそれぞれ独立して計画・ダウンロードされる
- 同一プラットフォーム・カテゴリ内で同名ファイルがある場合、連番付きで一意化される
- 設定ファイルへ書き出す `path` は `filePrefix` を含まない相対パスになる
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `CustomizationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `CustomizationConfigurator.getCustomization()` の通信に失敗した場合、`SystemError` がスローされる
- `FileDownloader.download()` の通信に失敗した場合、`SystemError(ExternalApiError)` がスローされる
- `FileWriter.write()` の書き込みに失敗した場合、`SystemError`（IO失敗）がスローされる

---

## detectCustomizationDiff

### 概要

ローカルの設定ファイルとkintoneアプリの現在の設定を比較し、差分を検出する。FILEリソースは内容まで比較し、ローカル・リモート双方に存在し内容が異なるものを modified として報告する。

### 入力DTO

```typescript
type DetectCustomizationDiffInput = {
  basePath: string;
};
```

- `basePath`: ローカルFILEリソースのパス解決に使用するベースディレクトリ

### 処理フロー

1. `CustomizationStorage.get()` と `CustomizationConfigurator.getCustomization()` を並行取得する
2. 設定ファイルが存在しない場合（`exists` が `false`）は `ValidationError(InvalidInput)` をスローする
3. `parseCustomizationConfigText()` でローカル設定テキストをパースする
4. 全プラットフォーム（desktop/mobile）・カテゴリ（js/css）について、ローカルFILEとリモートFILEを basename で照合し、マッチするペアを抽出する
5. 各ペアについて `FileContentReader.read()`（`basePath` でパス解決したローカルパス）と `FileDownloader.download()`（リモートのfileKey）で内容を並行取得し、バイナリ比較する。内容が異なるファイル名の集合を作る
6. `CustomizationDiffDetector.detect()` にローカル設定・リモート設定・変更ファイル名集合を渡して差分を得る

### 出力DTO

`CustomizationDiff`（`added`/`modified`/`deleted` の順にソートされた `entries`、件数サマリ、`isEmpty`、`warnings` を含む）

### テストケース

#### 正常系

- ローカルとリモートが一致する場合、`isEmpty` が `true` になる
- ローカルのみに存在するリソースは added として報告される
- リモートのみに存在するリソースは deleted として報告される
- ローカル・リモート双方にFILEとして存在し内容が異なる場合、modified として報告される
- ローカル・リモート双方にFILEとして存在し内容が一致する場合、差分なしになる
- scope がローカル（省略時は `ALL`）とリモートで異なる場合、`config`/`scope` の modified エントリが生成される
- 共有リソースの並び順が変わった場合、`(order)` の modified エントリが生成される
- URLリソースはURLで照合される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError(InvalidInput)` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- 設定テキストの構造が不正な場合、`ValidationError` がスローされる
- `CustomizationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `CustomizationConfigurator.getCustomization()` の通信に失敗した場合、`SystemError` がスローされる
- `FileContentReader.read()` の読み込みに失敗した場合、`SystemError`（IO失敗）がスローされる
- `FileDownloader.download()` の通信に失敗した場合、`SystemError(ExternalApiError)` がスローされる

---

## saveCustomization

### 概要

`captureCustomization` で生成したカスタマイズ設定テキストを設定ファイルへ保存する。

### 入力DTO

```typescript
type SaveCustomizationInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `CustomizationStorage.update()` で設定テキストをファイルへ書き込む

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定テキストがストレージへ書き込まれる

#### 異常系

- `CustomizationStorage.update()` の書き込みに失敗した場合、`SystemError`（IO失敗）がスローされる

---

## CLI実行コンテキスト

### customize apply コマンド

`applyCustomization` ユースケースをCLIから実行する。

- `CustomizationStorage` → `LocalFileCustomizationStorage`（ローカルYAMLファイル）
- `CustomizationConfigurator` → `KintoneCustomizationConfigurator`
- `FileUploader` → `KintoneFileUploader`
- 設定ファイルパス → `--customize-file` / `CUSTOMIZE_FILE_PATH` から取得（デフォルト: `customize.yaml`）
- カスタマイズ反映後、`confirmAndDeploy` で運用環境への反映を確認する

### customize capture コマンド

`captureCustomization` + `saveCustomization` ユースケースをCLIから実行する。

- `CustomizationConfigurator` → `KintoneCustomizationConfigurator`
- `CustomizationStorage` → `LocalFileCustomizationStorage`
- `FileDownloader` → kintone のファイルダウンロードアダプター
- `FileWriter` → ローカルファイル書き込みアダプター
- `basePath` → 設定ファイルパスのディレクトリ、`filePrefix` → 設定ファイル名から導出（ファイル名が `customize` の場合は空、それ以外はファイル名をプレフィックスに使用してアプリごとにファイルを隔離）
- `captureCustomization` 実行後、`hasExistingConfig` が `true` なら上書き警告を表示してから `saveCustomization` で保存する
- ダウンロードしたファイル数を `fileResourceCount` で通知する

### customize diff コマンド

`detectCustomizationDiff` ユースケースをCLIから実行する。

- `CustomizationConfigurator` → `KintoneCustomizationConfigurator`
- `CustomizationStorage` → `LocalFileCustomizationStorage`
- `FileDownloader` → kintone のファイルダウンロードアダプター
- `FileContentReader` → ローカルファイル読み込みアダプター
- `basePath` → 設定ファイルのディレクトリと `filePrefix` から算出する
- 差分結果を `printCustomizationDiffResult` で整形して出力する
