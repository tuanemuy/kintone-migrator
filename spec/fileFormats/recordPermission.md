# レコードアクセス権設定ファイル仕様

レコードレベルのアクセス権の設定ファイルフォーマット。フィルター条件でレコードを絞り込み、エンティティごとにアクセス権を設定する。

## kintone API リファレンス

- [レコードのアクセス権の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-record-permissions/)
- [レコードのアクセス権の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-record-permissions/)

## フォーマット

YAML形式で記述する。

```yaml
rights:
  - filterCond: status in ("active")
    entities:
      - entity:
          type: USER
          code: admin_user
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
      - entity:
          type: GROUP
          code: general_staff
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
  - filterCond: ""
    entities:
      - entity:
          type: FIELD_ENTITY
          code: creator
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
```

- `filterCond` が空文字列の場合は全レコードが対象
