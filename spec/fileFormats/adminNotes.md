# 管理者用メモ設定ファイル仕様

アプリ管理者用メモの設定ファイルフォーマット。

## kintone API リファレンス

- [アプリ管理者用メモを取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/get-app-admin-notes/)
- [アプリ管理者用メモを変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/update-app-admin-notes/)

## フォーマット

YAML形式で記述する。

```yaml
content: |
  <h2>アプリ管理メモ</h2>
  <p>このアプリは顧客管理用です。</p>
  <ul>
    <li>スキーマ変更はkintone-migratorで管理</li>
    <li>手動変更禁止</li>
  </ul>
includeInTemplateAndDuplicates: true
```

- `content` はメモの内容（HTML形式）
- `includeInTemplateAndDuplicates` はテンプレートやアプリ複製時にメモを含めるか
