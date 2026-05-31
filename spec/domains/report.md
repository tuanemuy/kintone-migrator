# Report

## ドメイン名

Report

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| レポート設定 | ReportsConfig | グラフ・レポートの望ましい状態を定義した設定 |
| レポート | ReportConfig | 個別のレポート定義 |
| レポートグループ | ReportGroup | 集計のグループ化設定 |
| レポート集計 | ReportAggregation | 集計方法の設定 |
| 定期レポート | PeriodicReport | 定期実行レポートの設定 |

## エンティティ

### ReportConfig

個別のレポート定義。

```typescript
type ReportConfig = Readonly<{
  chartType: ChartType;
  chartMode?: ChartMode;
  index: number;
  name: string;
  groups: readonly ReportGroup[];
  aggregations: readonly ReportAggregation[];
  filterCond: string;
  sorts: readonly ReportSort[];
  periodicReport?: PeriodicReport;
}>;
```

- `chartType` はグラフの種類（必須）。不正な値は `BusinessRuleError(RT_INVALID_CHART_TYPE)` をスローする
- `chartMode` はグラフの表示モード（オプション）。不正な値は `BusinessRuleError(RT_INVALID_CHART_MODE)` をスローする
- `index` は表示順序。省略可能で、省略時は `0` とする。負数・非整数の場合は `BusinessRuleError(RT_INVALID_CONFIG_STRUCTURE)` をスローする
- `name` はレポート名。`ReportsConfig.reports` のキー（マップキー）と同一の値であり、設定ファイル上はキーで表現する（[Record のキーと name](#record-のキーと-name) を参照）
- `groups`・`aggregations`・`sorts` は省略可能で、省略時は空配列とする
- `filterCond` は省略時に空文字（`""`）とする

#### Record のキーと name

`ReportsConfig.reports` はレポート名をキーとしたマップである。

- マップのキーがレポート名（`ReportConfig.name`）となる。設定ファイルでは `name` プロパティを別途記述せず、キーで名前を表現する
- 設定ファイル中に `name` プロパティが存在する場合は無視され、常にキーが優先される（capture 時もキーにレポート名を出力し、`name` プロパティは出力しない）
- キーが空文字の場合は `BusinessRuleError(RT_EMPTY_REPORT_NAME)` をスローする

### ReportsConfig

レポート設定の全体。

```typescript
type ReportsConfig = Readonly<{
  reports: Readonly<Record<string, ReportConfig>>;
}>;
```

- `reports` はレポート名をキーとしたレポート定義のマップ

## 値オブジェクト

### ChartType

グラフの種類。

```typescript
type ChartType = "BAR" | "COLUMN" | "PIE" | "LINE" | "PIVOT_TABLE" | "TABLE"
  | "AREA" | "SPLINE" | "SPLINE_AREA";
```

### ChartMode

グラフの表示モード。

```typescript
type ChartMode = "NORMAL" | "STACKED" | "PERCENTAGE";
```

### ReportGroup

集計のグループ化設定。

```typescript
type GroupPer = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE";

type ReportGroup = Readonly<{
  code: string;
  per?: GroupPer;
}>;
```

- `code` はグループ化に使うフィールドコード（必須・空文字不可）
- `per` は日付・時刻フィールドの集計単位（オプション）。日付系フィールド以外では指定しない

### ReportAggregation

集計方法の設定。

```typescript
type AggregationType = "COUNT" | "SUM" | "AVERAGE" | "MAX" | "MIN";

type ReportAggregation = Readonly<{
  type: AggregationType;
  code?: string;
}>;
```

- `type` は集計方法（必須）
- `code` は集計対象フィールドのコード（オプション）。`type` が `COUNT`（件数）の場合は対象フィールドが不要なため省略する。`SUM` / `AVERAGE` / `MAX` / `MIN` では集計対象の数値フィールドコードを指定する

### ReportSort

ソート設定。

```typescript
type SortBy = "TOTAL" | "GROUP1" | "GROUP2" | "GROUP3";
type SortOrder = "ASC" | "DESC";

type ReportSort = Readonly<{
  by: SortBy;
  order: SortOrder;
}>;
```

### DayOfWeek

曜日。

```typescript
type DayOfWeek = "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY"
  | "THURSDAY" | "FRIDAY" | "SATURDAY";
```

### PeriodicReport

定期実行レポートの設定。

```typescript
type PeriodicReportEvery = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR";
type PeriodicReportPattern = "JAN_APR_JUL_OCT" | "FEB_MAY_AUG_NOV" | "MAR_JUN_SEP_DEC";

type PeriodicReportPeriod = Readonly<{
  every: PeriodicReportEvery;
  month?: number;
  pattern?: PeriodicReportPattern;
  dayOfMonth?: number | "END_OF_MONTH";
  time?: string;
  dayOfWeek?: DayOfWeek;
  minute?: number;
}>;

type PeriodicReport = Readonly<{
  active: boolean;
  period: PeriodicReportPeriod;
}>;
```

- `active` は定期レポートの有効/無効（必須・真偽値）
- `period.every` は実行周期（必須）。`YEAR` / `QUARTER` / `MONTH` / `WEEK` / `DAY` / `HOUR` のいずれか

#### period の各プロパティの値域

`period` のオプションプロパティは独立に値域検証され、不正値は `BusinessRuleError(RT_INVALID_CONFIG_STRUCTURE)` をスローする。

| プロパティ | 型・値域 |
| --- | --- |
| `month` | 1〜12 の整数 |
| `pattern` | `JAN_APR_JUL_OCT` / `FEB_MAY_AUG_NOV` / `MAR_JUN_SEP_DEC` |
| `dayOfMonth` | 1〜31 の整数、または文字列 `"END_OF_MONTH"`（月末） |
| `dayOfWeek` | `DayOfWeek`（`SUNDAY`〜`SATURDAY`） |
| `time` | 通知時刻（`"HH:MM"`） |
| `minute` | 10 の倍数（`0`・`10`・`20`・`30`・`40`・`50`） |

#### every 別に意味を持つプロパティ

`every` の値によって意味を持つ `period` のプロパティが異なる。各プロパティは独立に値域検証されるが、`every` と無関係なプロパティは kintone 側で無視される。`every` ごとに記述すべきプロパティの目安は次のとおり。

| `every` | 意味を持つプロパティ | 説明 |
| --- | --- | --- |
| `YEAR` | `month`, `dayOfMonth`, `time` | 毎年、指定月・指定日・指定時刻に実行 |
| `QUARTER` | `pattern`, `dayOfMonth`, `time` | 四半期ごと、対象月パターン・指定日・指定時刻に実行 |
| `MONTH` | `dayOfMonth`, `time` | 毎月、指定日・指定時刻に実行 |
| `WEEK` | `dayOfWeek`, `time` | 毎週、指定曜日・指定時刻に実行 |
| `DAY` | `time` | 毎日、指定時刻に実行 |
| `HOUR` | `minute` | 毎時、指定分（10分刻み）に実行 |

## ポート

### ReportConfigurator

kintoneアプリのレポート設定を取得・更新するためのインターフェース。

```typescript
interface ReportConfigurator {
  getReports(): Promise<{
    reports: Readonly<Record<string, ReportConfig>>;
    revision: string;
  }>;
  updateReports(params: {
    reports: Readonly<Record<string, ReportConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getReports()` は現在のレポート設定をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateReports()` はレポート設定を更新する（全置換方式）。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### ReportStorage

レポート設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[レポート設定ファイル仕様](../fileFormats/report.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `report apply` | YAML設定ファイルからレポート設定を適用する |
| `report capture` | 現在のレポート設定をYAMLファイルに保存する |
| `report diff` | ローカルのレポート設定とリモートの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--report-file` | `REPORT_FILE_PATH` | レポート設定ファイルパス（デフォルト: `reports.yaml`、マルチアプリ: `report/<appName>.yaml`） |
