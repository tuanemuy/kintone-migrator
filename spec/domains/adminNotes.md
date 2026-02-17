# AdminNotes

## ドメイン名

AdminNotes

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| 管理者用メモ設定 | AdminNotesConfig | アプリ管理者用メモの望ましい状態を定義した設定 |

## エンティティ

### AdminNotesConfig

アプリ管理者用メモの設定。

```typescript
type AdminNotesConfig = Readonly<{
  content: string;
  includeInTemplateAndDuplicates: boolean;
}>;
```

- `content` はメモの内容（HTML形式）
- `includeInTemplateAndDuplicates` はテンプレートやアプリ複製時にメモを含めるか

## ポート

### AdminNotesConfigurator

kintoneアプリの管理者用メモを取得・更新するためのインターフェース。

### AdminNotesStorage

管理者用メモ設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

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

## CLI

| コマンド | 説明 |
| --- | --- |
| `admin-notes apply` | YAML設定ファイルから管理者用メモを適用する |
| `admin-notes capture` | 現在の管理者用メモをYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--admin-notes-file` | `ADMIN_NOTES_FILE_PATH` | 管理者用メモ設定ファイルパス（デフォルト: `admin-notes.yaml`、マルチアプリ: `admin-notes/<appName>.yaml`） |
