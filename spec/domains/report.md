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

### ReportsConfig

レポート設定の全体。

```typescript
type ReportsConfig = Readonly<{
  reports: Readonly<Record<string, ReportConfig>>;
}>;
```

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

### ReportAggregation

集計方法の設定。

```typescript
type AggregationType = "COUNT" | "SUM" | "AVERAGE" | "MAX" | "MIN";

type ReportAggregation = Readonly<{
  type: AggregationType;
  code?: string;
}>;
```

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

### PeriodicReport

定期実行レポートの設定。

```typescript
type PeriodicReportEvery = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY" | "HOUR";
type PeriodicReportPattern = "JAN_APR_JUL_OCT" | "FEB_MAY_AUG_NOV" | "MAR_JUN_SEP_DEC";

type PeriodicReportPeriod = Readonly<{
  every: PeriodicReportEvery;
  month?: number;
  pattern?: PeriodicReportPattern;
  dayOfMonth?: number | string;
  time?: string;
  dayOfWeek?: string;
  minute?: number;
}>;

type PeriodicReport = Readonly<{
  active: boolean;
  period: PeriodicReportPeriod;
}>;
```

## ポート

### ReportConfigurator

kintoneアプリのレポート設定を取得・更新するためのインターフェース。

### ReportStorage

レポート設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[レポート設定ファイル仕様](../fileFormats/report.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `report apply` | YAML設定ファイルからレポート設定を適用する |
| `report capture` | 現在のレポート設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--report-file` | `REPORT_FILE_PATH` | レポート設定ファイルパス（デフォルト: `reports.yaml`、マルチアプリ: `report/<appName>.yaml`） |
