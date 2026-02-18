# 通知設定ファイル仕様

通知設定の設定ファイルフォーマット。一般通知、レコード条件通知、リマインダー通知の3種類を定義する。

## kintone API リファレンス

- [アプリの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-notification-settings/)
- [レコードの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-per-record-notification-settings/)
- [リマインダーの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-reminder-notification-settings/)

## フォーマット

YAML形式で記述する。

```yaml
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin_user
      recordAdded: true
      recordEdited: true
      commentAdded: true
      statusChanged: true
      fileImported: false
    - entity:
        type: GROUP
        code: managers
      includeSubs: true
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: true
      fileImported: false
perRecord:
  - filterCond: priority in ("high")
    title: 高優先度レコードの更新
    targets:
      - entity:
          type: USER
          code: manager
      - entity:
          type: ORGANIZATION
          code: sales_dept
        includeSubs: true
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: deadline
      daysLater: -1
      time: "09:00"
      filterCond: status not in ("完了")
      title: 締切日リマインダー
      targets:
        - entity:
            type: FIELD_ENTITY
            code: creator
```
