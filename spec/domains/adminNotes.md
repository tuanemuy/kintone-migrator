# AdminNotes

## ドメイン名

AdminNotes

本ドメインは kintone の「アプリ管理者用メモ」機能（アプリ設定画面で管理者が編集できるメモ）そのものを対象とする。FormSchema 管理シナリオで宣言的設定の保存先を指す「管理者用メモ」という語法とは別概念であり、混同しないこと。

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| 管理者用メモ設定 | AdminNotesConfig | アプリ管理者用メモの望ましい状態を定義した設定 |
| 管理者用メモ差分 | AdminNotesDiff | ローカル設定とリモート設定の差分結果 |
| 差分エントリ | AdminNotesDiffEntry | 個々の差分項目（管理者用メモは単一の設定値であるため `modified` のみ） |

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

## 値オブジェクト

### AdminNotesDiff / AdminNotesDiffEntry

ローカル設定（望ましい状態）とリモート設定（現在の状態）の差分を表す値オブジェクト。管理者用メモは単一の設定（シングルトン）であり、追加（added）・削除（deleted）の概念を持たないため、差分種別は `modified` のみとする。

```typescript
type AdminNotesDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

type AdminNotesDiff = Readonly<{
  entries: readonly AdminNotesDiffEntry[];
  summary: Readonly<{
    added: number;
    modified: number;
    deleted: number;
    total: number;
  }>;
  isEmpty: boolean;
  warnings: readonly string[];
}>;
```

- `field` は差分のあったフィールド名（`content` または `includeInTemplateAndDuplicates`）
- `details` は変更内容の要約テキスト（例: `"旧メモ..." -> "新メモ..."`、`content` は長い場合に先頭30文字へ切り詰める）
- `summary.added` / `summary.deleted` は常に 0
- `isEmpty` は差分がない場合に `true`

## ドメインサービス

### AdminNotesDiffDetector

ローカル設定（望ましい状態）とリモート設定（現在の状態）を比較し、差分を検出する純粋関数。

```typescript
const AdminNotesDiffDetector = {
  detect: (
    local: AdminNotesConfig,
    remote: AdminNotesConfig,
  ): AdminNotesDiff;
};
```

- `content` が異なる場合、`field: "content"` の `modified` エントリを生成する（前後の値は先頭30文字へ切り詰めて要約）
- `includeInTemplateAndDuplicates` が異なる場合、`field: "includeInTemplateAndDuplicates"` の `modified` エントリを生成する
- 差分がない場合は `isEmpty: true` の結果を返す

### AdminNotesConfigParser

パース済みの管理者用メモ設定データ（`unknown`）を検証し、`AdminNotesConfig` に変換する純粋関数。YAMLテキストのパースはアプリケーション層（ConfigCodec）が担う。

```typescript
const AdminNotesConfigParser = {
  parse: (parsed: unknown): AdminNotesConfig;
};
```

- 構造が不正な場合（オブジェクトでない、`content` 文字列または `includeInTemplateAndDuplicates` 真偽値を持たない等）は `BusinessRuleError(AN_INVALID_CONFIG_STRUCTURE)` をスローする

### AdminNotesConfigSerializer

管理者用メモ設定をシリアライズ用のプレーンなデータ（`Record<string, unknown>`）に変換する純粋関数。`Record<string, unknown>` → YAMLテキストへの変換はアプリケーション層（ConfigCodec）が担う。

```typescript
const AdminNotesConfigSerializer = {
  serialize: (config: AdminNotesConfig): Record<string, unknown>;
};
```

## ポート

### AdminNotesConfigurator

kintoneアプリの管理者用メモを取得・更新するためのインターフェース。

### AdminNotesStorage

管理者用メモ設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[管理者用メモ設定ファイル仕様](../fileFormats/adminNotes.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `admin-notes apply` | YAML設定ファイルから管理者用メモを適用する |
| `admin-notes capture` | 現在の管理者用メモをYAMLファイルに保存する |
| `admin-notes diff` | ローカル設定ファイルとリモートの管理者用メモの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--admin-notes-file` | `ADMIN_NOTES_FILE_PATH` | 管理者用メモ設定ファイルパス（デフォルト: `admin-notes.yaml`、マルチアプリ: `admin-notes/<appName>.yaml`） |
