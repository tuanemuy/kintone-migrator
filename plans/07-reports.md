# 07: グラフ・レポート設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getReports()` / `client.app.updateReports()` を使用

## 公式ドキュメント

- グラフの設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/report/get-graph-settings/>
- グラフの設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/report/update-graph-settings/>

## APIレスポンス構造

```
GET /k/v1/app/reports.json → { reports: { [name]: ReportConfig }, revision }
PUT /k/v1/preview/app/reports.json ← { app, reports: { [name]: ReportConfig }, revision? }
```

ReportConfigのプロパティ:
- `chartType`: BAR / COLUMN / PIE / LINE / PIVOT_TABLE / TABLE / AREA / SPLINE / SPLINE_AREA
- `chartMode`: NORMAL / STACKED / PERCENTAGE
- `name`, `id`, `index`
- `groups[]`: `{ code, per? }` （per: YEAR / QUARTER / MONTH / WEEK / DAY / HOUR / MINUTE）
- `aggregations[]`: `{ type }` （COUNT / SUM / AVERAGE / MAX / MIN）
- `filterCond`: クエリ形式
- `sorts[]`: ソート設定
- `periodicReport`: `{ active, period: { every, dayOfMonth?, time?, dayOfWeek?, minute? } }`

## YAMLスキーマ例

```yaml
reports:
  月次タスク集計:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups:
      - code: 作成日時
        per: MONTH
    aggregations:
      - type: COUNT
    filterCond: ""
    sorts:
      - by: GROUP
        order: ASC
    periodicReport:
      active: true
      period:
        every: MONTH
        dayOfMonth: 1
        time: "08:00"
  担当者別タスク数:
    chartType: PIE
    chartMode: NORMAL
    index: 1
    groups:
      - code: 担当者
    aggregations:
      - type: COUNT
    filterCond: "ステータス not in (\"完了\")"
```

## コマンド

| コマンド | 説明 |
|---|---|
| `report capture` | 現在のグラフ設定をYAMLに出力 |
| `report apply` | YAMLからグラフ設定を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/report/
  entity.ts, valueObject.ts, errorCode.ts
  ports/reportConfigurator.ts, ports/reportStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/reportConfigurator.ts
src/core/adapters/local/reportStorage.ts

src/core/application/container/report.ts
src/core/application/report/
  captureReport.ts, applyReport.ts, parseConfig.ts, saveReport.ts, __tests__/

src/cli/commands/report/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- `id` はkintone内部IDのためYAMLには含めない（名前でマッチング）
- `periodicReport` は省略可能
- デプロイが必要
