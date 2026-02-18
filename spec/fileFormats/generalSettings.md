# 一般設定ファイル仕様

アプリの一般設定の設定ファイルフォーマット。すべてのフィールドはオプショナルで、指定されたフィールドのみが更新される。

## kintone API リファレンス

- [アプリの一般設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-settings/)
- [アプリの一般設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-general-settings/)

## フォーマット

YAML形式で記述する。

```yaml
name: 顧客管理
description: 顧客情報を管理するアプリ
icon:
  type: PRESET
  key: APP006
theme: WHITE
titleField:
  selectionMode: MANUAL
  code: customer_name
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
enableDuplicateRecord: true
enableInlineRecordEditing: true
numberPrecision:
  digits: 16
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
```
