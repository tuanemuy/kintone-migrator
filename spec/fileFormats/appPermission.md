# アプリアクセス権設定ファイル仕様

アプリレベルのアクセス権の設定ファイルフォーマット。

## kintone API リファレンス

- [アプリのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-permissions/)
- [アプリのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-app-permissions/)

## フォーマット

YAML形式で記述する。

```yaml
rights:
  - entity:
      type: USER
      code: admin_user
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: GROUP
      code: general_staff
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
```
