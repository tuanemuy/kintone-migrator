# Report ユースケース

## applyReport

### 概要

ローカルの設定ファイル（reports.yaml）に定義されたレポート設定をkintoneアプリに適用する。全置換方式を採用し、YAMLファイルが完全な望ましい状態を表現する。設定ファイルに存在しないレポートはリモートからも削除される。

### 入力DTO

なし

### 処理フロー

1. `ReportStorage.get()` で設定テキストを取得する。ファイルが存在しない場合は `ValidationError`（メッセージ: `Report config file not found`）をスローする
2. `parseReportConfigText()`（`ConfigCodec` でYAMLをパースし `ReportConfigParser.parse()` で検証）で `ReportsConfig` を得る
3. `ReportConfigurator.getReports()` で現在のレポート設定と `revision` を取得する
4. `ReportConfigurator.updateReports({ reports, revision })` でレポート設定を全置換更新する。取得した `revision` を渡すことで楽観的同時実行制御を行う

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルからレポート設定を読み込み、kintoneアプリに全置換で適用する
- `getReports()` で取得した現在の `revision` が `updateReports()` に渡される
- 設定ファイルに存在しないレポートはリモートから削除される（全置換）

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Report config file not found`）がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- レポート設定の構造が不正な場合（不正な `chartType` 等）、ドメインの `BusinessRuleError` が `ValidationError` に変換されてスローされる
- `ReportStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `ReportConfigurator.getReports()` の通信に失敗した場合、`SystemError` がスローされる
- `ReportConfigurator.updateReports()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureReport

### 概要

kintoneアプリから現在のレポート設定を取得し、YAML形式でシリアライズしてファイルに保存する。

### 入力DTO

なし

### 処理フロー

1. `ReportConfigurator.getReports()` で現在のレポート設定を取得する
2. `ReportConfigSerializer.serialize()` でシリアライズ用データに変換し、`ConfigCodec` でYAML文字列にシリアライズする
3. `ReportStorage.get()` で既存ファイルの有無を確認する
4. 結果を返す

### 出力DTO

```typescript
type CaptureReportOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリからレポート設定を取得し、YAML文字列にシリアライズする
- レポート名はマップのキーとして出力され、`name` プロパティは出力されない
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- `ReportConfigurator.getReports()` の通信に失敗した場合、`SystemError` がスローされる
- `ReportStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectReportDiff

### 概要

ローカルの設定ファイル（reports.yaml）に定義されたレポート設定とkintoneアプリのリモート設定を比較し、差分を検出する。apply 前のプレビューや `report diff` コマンドで利用する。

### 入力DTO

なし

### 処理フロー

1. `ReportStorage.get()` と `ReportConfigurator.getReports()` を並行実行し、ローカル設定テキストとリモート設定を取得する
2. ローカルファイルが存在しない場合は `ValidationError`（メッセージ: `Report config file not found`）をスローする
3. `parseReportConfigText()` でローカル設定テキストを `ReportsConfig` にパース・検証する
4. `ReportDiffDetector.detect(local, { reports: remote.reports })` で差分を検出する
5. `ReportDiff` を返す

### 出力DTO

```typescript
type ReportDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  reportName: string;
  details: string;
}>;

type ReportDiff = DiffResult<ReportDiffEntry>;
// = Readonly<{
//   entries: readonly ReportDiffEntry[];
//   summary: { added; modified; deleted; total };
//   isEmpty: boolean;
//   warnings: readonly string[];
// }>
```

- ローカルにのみ存在するレポートは `added`、リモートにのみ存在するレポートは `deleted`、両方に存在し内容が異なるレポートは `modified` として分類される

### テストケース

#### 正常系

- ローカルとリモートのレポート設定を比較し、追加・変更・削除を検出する
- 差分がない場合、`isEmpty` が `true` になる
- `summary` に追加・変更・削除の件数が集計される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError`（`Report config file not found`）がスローされる
- 設定テキストのYAMLフォーマットまたは構造が不正な場合、`ValidationError` がスローされる
- `ReportStorage.get()` または `ReportConfigurator.getReports()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveReport

### 概要

レポート設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveReportInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `ReportStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

---

## CLI実行コンテキスト

### report apply コマンド

`detectReportDiff` で差分をプレビューし、確認のうえ `applyReport` ユースケースを実行する。

- `ReportStorage` → `LocalFileReportStorage`（ローカルYAMLファイル）
- `ReportConfigurator` → `KintoneReportConfigurator`
- 設定ファイルパス → `--report-file` / `REPORT_FILE_PATH` から取得（デフォルト: `reports.yaml`、マルチアプリ: `report/<appName>.yaml`）
- 適用前に `detectReportDiff` の結果を `printReportDiffResult` で表示し、適用を確認する
- レポート設定反映後、`confirmAndDeploy` で運用環境への反映を確認する

### report capture コマンド

`captureReport` + `saveReport` ユースケースをCLIから実行する。

- `ReportStorage` → `LocalFileReportStorage`（ローカルYAMLファイル）
- `ReportConfigurator` → `KintoneReportConfigurator`
- 設定ファイルパス → `--report-file` / `REPORT_FILE_PATH` から取得（デフォルト: `reports.yaml`、マルチアプリ: `report/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### report diff コマンド

`detectReportDiff` ユースケースをCLIから実行する。

- `ReportStorage` → `LocalFileReportStorage`（ローカルYAMLファイル）
- `ReportConfigurator` → `KintoneReportConfigurator`
- 設定ファイルパス → `--report-file` / `REPORT_FILE_PATH` から取得（デフォルト: `reports.yaml`、マルチアプリ: `report/<appName>.yaml`）
- 差分結果を `printReportDiffResult` で表示する
