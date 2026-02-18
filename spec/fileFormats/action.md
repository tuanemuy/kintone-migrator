# アクション設定ファイル仕様

アクション（レコードコピー）設定の設定ファイルフォーマット。アクションはアクション名をキーとして識別される。

## kintone API リファレンス

- [アプリのアクション設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-action-settings/)
- [アプリのアクション設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-action-settings/)

## フォーマット

YAML形式で記述する。

```yaml
actions:
  案件コピー:
    index: 0
    destApp:
      app: "20"
    mappings:
      - srcType: FIELD
        srcField: customer_name
        destField: customer_name
      - srcType: FIELD
        srcField: amount
        destField: amount
      - srcType: RECORD_URL
        destField: source_url
    entities:
      - type: USER
        code: admin_user
      - type: GROUP
        code: sales_team
    filterCond: status in ("approved")
```
