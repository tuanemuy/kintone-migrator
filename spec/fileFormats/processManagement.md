# プロセス管理設定ファイル仕様

プロセス管理（ワークフロー）の設定ファイルフォーマット。ステータス定義とステータス間の遷移アクションを記述する。

## kintone API リファレンス

- [プロセス管理の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-process-management-settings/)
- [プロセス管理の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-process-management-settings/)

## フォーマット

YAML形式で記述する。

```yaml
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: CREATOR
  処理中:
    index: 1
    assignee:
      type: ONE
      entities:
        - type: USER
          code: manager
  完了:
    index: 2
    assignee:
      type: ONE
      entities: []
actions:
  - name: 処理開始
    from: 未処理
    to: 処理中
    filterCond: ""
    type: PRIMARY
    executableUser:
      entities:
        - type: USER
          code: manager
  - name: 完了にする
    from: 処理中
    to: 完了
    filterCond: ""
    type: PRIMARY
```
