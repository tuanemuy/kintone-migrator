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

## フィールド定義

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `content` | string | 必須 | メモの内容（HTML形式） |
| `includeInTemplateAndDuplicates` | boolean | 必須 | テンプレート・アプリ複製時にメモを含めるか |

## バリデーション

パース時に以下を検証する。詳細は [AdminNotes ドメイン仕様](../domains/adminNotes.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `AN_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（オブジェクトでない、`content` / `includeInTemplateAndDuplicates` の型不一致 等） |

## エラーコード

| 定数 | コード |
| --- | --- |
| `AnInvalidConfigStructure` | `AN_INVALID_CONFIG_STRUCTURE` |
