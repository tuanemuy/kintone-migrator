# プラグイン設定ファイル仕様

プラグインの有効/無効設定の設定ファイルフォーマット。

## kintone API リファレンス

- [アプリに追加されているプラグインの一覧を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-plugins/)
- [アプリにプラグインを追加する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/add-app-plugins/)

## フォーマット

YAML形式で記述する。

```yaml
plugins:
  - id: djmhffjlbojgcbnahicgdjiahbegolkj
    name: 条件分岐プラグイン
    enabled: true
  - id: pafgcfghlmjicbadmkohfoihfkblahhe
    name: カレンダーPlusプラグイン
    enabled: true
  - id: kintone-plugin-example-id
    name: テスト用プラグイン
    enabled: false
```
