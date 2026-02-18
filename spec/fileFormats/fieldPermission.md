# フィールドアクセス権設定ファイル仕様

フィールドアクセス権の設定ファイルフォーマット。ファイルは完全な望ましい状態を表し、適用時にすべての権限が置換される。

## kintone API リファレンス

- [フィールドのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-field-permissions/)
- [フィールドのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-field-permissions/)

## フォーマット

YAML形式で記述する。

```yaml
rights:
  - code: field_code_1
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
      - accessibility: READ
        entity:
          type: GROUP
          code: group1
        includeSubs: true
```
