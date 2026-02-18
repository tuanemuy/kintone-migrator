# ビュー設定ファイル仕様

一覧（ビュー）設定の設定ファイルフォーマット。ビューはビュー名をキーとして識別される。

## kintone API リファレンス

- [一覧の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/get-views/)
- [一覧の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/update-views/)

## フォーマット

YAML形式で記述する。

```yaml
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - customer_name
      - customer_code
      - status
    filterCond: status in ("active")
    sort: customer_code asc
    pager: true
    device: ANY
  カレンダー:
    type: CALENDAR
    index: 1
    date: scheduled_date
    title: customer_name
    filterCond: ""
  カスタムビュー:
    type: CUSTOM
    index: 2
    html: "<div id='my-view'></div>"
    pager: false
```

ビュータイプ: `LIST`, `CALENDAR`, `CUSTOM`
