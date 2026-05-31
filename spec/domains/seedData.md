# SeedData ドメイン

## 概要

kintoneアプリのレコードデータ（シードデータ）をYAML/JSONファイルで宣言的に管理し、Upsert方式でアプリに反映するドメイン。

## ユビキタス言語

| 用語 | 説明 |
| --- | --- |
| SeedData | シードファイルから読み込まれたデータ全体（キー + レコード配列） |
| SeedRecord | 1レコード分のフラットなキー・バリューデータ |
| UpsertKey | Upsert操作のキーとなるフィールドコード（ブランド型）。cleanモードでは省略可能（null） |
| UpsertPlan | 既存レコードとの比較結果（追加・更新・変更なしの分類） |
| UpsertSeedOutput | Upsert操作の実行結果（追加数・更新数・変更なし数・削除数）。アプリケーション層で定義 |
| RecordFieldValue | レコードフィールドの値（文字列、文字列配列、ユーザー配列、サブテーブル行配列） |

## エンティティ

### SeedData

シードファイルのパース結果を表すエンティティ。

```typescript
type SeedData = Readonly<{
  key: UpsertKey | null;
  records: readonly SeedRecord[];
}>;
```

- `key` が `null` の場合、Upsertキーが未指定であることを意味する。`--clean` モード（全レコード削除後に新規追加）またはキー未指定での全件追加時に使用される

### UpsertPlan

既存レコードとシードデータの比較結果。

```typescript
type UpsertPlan = Readonly<{
  toAdd: readonly SeedRecord[];
  toUpdate: readonly SeedRecordWithId[];
  unchanged: number;
}>;
```

### UpsertSeedOutput

Upsert操作の実行結果。ドメイン層では `UpsertPlan` までを責務とし、実行結果の集計はアプリケーション層の `UpsertSeedOutput`（`dto.ts` で定義）として管理する。本型はエンティティではなくアプリケーション層のDTO（出力データ）であり、ドメイン層には存在しない。

```typescript
// アプリケーション層 (dto.ts) で定義
type UpsertSeedOutput = Readonly<{
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  total: number;
}>;
```

- `deleted` は `--clean` モード時に削除されたレコード数。通常の Upsert 操作では `0`

## 値オブジェクト

### UpsertKey

非空文字列のブランド型。Upsertキーとなるフィールドコードを表す。

### SeedRecord

`Readonly<Record<string, RecordFieldValue>>` — フラットなキー・バリュー形式の1レコード。

### RecordFieldValue

`string | readonly string[] | readonly UserEntity[] | readonly SubtableRow[]`

## ドメインサービス

### SeedParser

YAML/JSONテキスト → SeedDataエンティティへのパース。バリデーション含む。

### SeedSerializer

SeedData → YAMLテキストへのシリアライズ。capture用。

### RecordConverter

フラットSeedRecord形式 ↔ kintone `{ field_code: { value: ... } }` 形式の双方向変換。
システムフィールド（`$id`, `$revision`, `RECORD_NUMBER`, `CREATOR`, `CREATED_TIME`, `MODIFIER`, `UPDATED_TIME`, `STATUS`, `STATUS_ASSIGNEE`, `CATEGORY`）は除外。

**配置**: RecordConverter は kintone 型との変換を担うため、ポート境界には現れず**アダプター層（`RecordManager` の実装）内で完結する**。`RecordManager` ポートはドメイン型（`SeedRecord`/`SeedRecordWithId`）のみを入出力し、Kintone 型（`KintoneRecordForResponse`/`KintoneRecordForParameter`）はポート境界の外に露出しない。これにより、アプリケーション層・ドメイン層は kintone の型に依存しない。

### UpsertPlanner

既存レコードとシードデータを比較し、UpsertPlanを生成。キーフィールド値でマッチング、深い比較でunchangedを検出。

## ポート

### RecordManager

kintoneレコード操作の抽象化インターフェース。

ポート境界では**ドメイン型のみ**を扱う。Kintone 型との変換は実装（アダプター）内の RecordConverter が担う。

```typescript
interface RecordManager {
  getAllRecords(condition?: string): Promise<readonly SeedRecordWithId[]>;
  addRecords(records: readonly SeedRecord[]): Promise<void>;
  updateRecords(records: readonly SeedRecordWithId[]): Promise<void>;
  deleteAllRecords(): Promise<{ deletedCount: number }>;
}
```

- `getAllRecords()` は取得した kintone レコードをアダプター内で `SeedRecordWithId`（id 付きフラット形式）へ変換して返す。アプリケーション層で別途 `RecordConverter.fromKintoneRecord` を呼ぶ必要はない。
- `addRecords()` / `updateRecords()` はドメインの `SeedRecord` / `SeedRecordWithId` を受け取り、アダプター内で kintone 形式へ変換して送信する。
- `deleteAllRecords()` は全レコードを削除し、削除件数を返す。`--clean` モードで使用される

### SeedStorage

シードファイルの読み書きインターフェース。

```typescript
interface SeedStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる

## エラーコード

| コード | 説明 |
| --- | --- |
| EMPTY_UPSERT_KEY | Upsertキーが空 |
| EMPTY_SEED_TEXT | シードテキストが空 |
| INVALID_SEED_YAML | YAML構文エラー |
| INVALID_SEED_STRUCTURE | 構造バリデーション失敗 |
| DUPLICATE_KEY_VALUE | キーフィールド値の重複 |
| MISSING_KEY_FIELD | レコードにキーフィールドがない |
