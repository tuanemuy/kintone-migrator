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
