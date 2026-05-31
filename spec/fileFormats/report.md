# レポート設定ファイル仕様

グラフ・レポート設定の設定ファイルフォーマット。レポートはレポート名をキーとして識別される。

## kintone API リファレンス

- [グラフの設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/report/get-graph-settings/)
- [グラフの設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/report/update-graph-settings/)

## フォーマット

YAML形式で記述する。

```yaml
reports:
  月別売上:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups:
      - code: order_date
        per: MONTH
    aggregations:
      - type: SUM
        code: amount
    filterCond: ""
    sorts:
      - by: GROUP1
        order: ASC
  担当者別件数:
    chartType: PIE
    index: 1
    groups:
      - code: assignee
    aggregations:
      - type: COUNT
    filterCond: status in ("active")
    sorts:
      - by: TOTAL
        order: DESC
    periodicReport:
      active: true
      period:
        every: MONTH
        dayOfMonth: 1
        time: "09:00"
```

グラフタイプ: `BAR`, `COLUMN`, `PIE`, `LINE`, `PIVOT_TABLE`, `TABLE`, `AREA`, `SPLINE`, `SPLINE_AREA`

## フィールド定義

レポートは `reports` 配下のキー（レポート名）で識別される。各レポート定義は次の構造を持つ。

**`reports.<レポート名>`**（Report）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `chartType` | ChartType | 必須 | グラフの種類（後述の一覧） |
| `chartMode` | `"NORMAL"` \| `"STACKED"` \| `"PERCENTAGE"` | 任意 | グラフの表示モード |
| `index` | number | 任意 | 表示順序（非負整数）。省略時は `0` |
| `groups` | ReportGroup[] | 任意 | 分類（グルーピング）の定義 |
| `aggregations` | ReportAggregation[] | 必須 | 集計方法の定義 |
| `filterCond` | string | 任意 | 集計対象レコードの絞り込み条件 |
| `sorts` | ReportSort[] | 任意 | 並び順の定義 |
| `periodicReport` | PeriodicReport | 任意 | 定期レポートの設定 |

**`reports.<name>.groups[]`**（ReportGroup）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | 必須 | 分類に使うフィールドコード |
| `per` | string | 任意 | 日時フィールドの集計単位（値域は下記参照） |

**`reports.<name>.aggregations[]`**（ReportAggregation）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `type` | `"COUNT"` \| `"SUM"` \| `"AVERAGE"` \| `"MAX"` \| `"MIN"` | 必須 | 集計方法 |
| `code` | string | 任意 | 集計対象フィールドコード（`COUNT` 以外で必須） |

**`reports.<name>.sorts[]`**（ReportSort）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `by` | `"TOTAL"` \| `"GROUP1"` \| `"GROUP2"` \| `"GROUP3"` | 必須 | 並び替えの基準 |
| `order` | `"ASC"` \| `"DESC"` | 必須 | 昇順・降順 |

**`reports.<name>.periodicReport`**（PeriodicReport）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `active` | boolean | 必須 | 定期レポートを有効にするか |
| `period` | PeriodicReportPeriod | 任意 | 配信周期（子プロパティの値域・条件付き必須は下記参照） |

## フィールドの値域・制約

- `reports` のキー: レポート名。空文字不可。キーがそのままレポート名になるため、各レポート定義に `name` プロパティは記述しない（記述しても無視される）
- `chartMode`: `NORMAL` / `STACKED` / `PERCENTAGE`（オプション）
- `index`: レポートの表示順序。非負整数。省略時は `0`
- `groups[].per`: `YEAR` / `QUARTER` / `MONTH` / `WEEK` / `DAY` / `HOUR` / `MINUTE`（オプション）
- `aggregations[].type`: `COUNT` / `SUM` / `AVERAGE` / `MAX` / `MIN`。`COUNT` のとき `code` は不要、それ以外は集計対象フィールドの `code` を指定
- `sorts[].by`: `TOTAL` / `GROUP1` / `GROUP2` / `GROUP3`、`sorts[].order`: `ASC` / `DESC`
- `periodicReport.period`
    - `every`: `YEAR` / `QUARTER` / `MONTH` / `WEEK` / `DAY` / `HOUR`
    - `month`: 1〜12
    - `pattern`: `JAN_APR_JUL_OCT` / `FEB_MAY_AUG_NOV` / `MAR_JUN_SEP_DEC`
    - `dayOfMonth`: 1〜31 の整数、または `END_OF_MONTH`（月末）
    - `dayOfWeek`: `SUNDAY`〜`SATURDAY`
    - `time`: `"HH:MM"`
    - `minute`: 10 の倍数（`0`〜`50`）
    - `every` 別に意味を持つプロパティの対応は [レポートドメイン](../domains/report.md#every-別に意味を持つプロパティ) を参照

## バリデーション

パース時に以下を検証する。詳細は [Report ドメイン仕様](../domains/report.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `RT_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`reports` がオブジェクトでない 等） |
| `RT_INVALID_CHART_TYPE` | `chartType` が許容値以外 |
| `RT_INVALID_CHART_MODE` | `chartMode` が許容値以外 |
| `RT_EMPTY_REPORT_NAME` | レポート名（`reports` のキー）が空文字 |

## エラーコード

| 定数 | コード |
| --- | --- |
| `RtInvalidConfigStructure` | `RT_INVALID_CONFIG_STRUCTURE` |
| `RtInvalidChartType` | `RT_INVALID_CHART_TYPE` |
| `RtInvalidChartMode` | `RT_INVALID_CHART_MODE` |
| `RtEmptyReportName` | `RT_EMPTY_REPORT_NAME` |
