# SeedData ドメイン

## 概要

kintoneアプリのレコードデータ（シードデータ）をYAML/JSONファイルで宣言的に管理し、Upsert方式でアプリに反映するドメイン。

## ユビキタス言語

| 用語 | 説明 |
| --- | --- |
| SeedData | シードファイルから読み込まれたデータ全体（キー + レコード配列） |
| SeedRecord | 1レコード分のフラットなキー・バリューデータ |
| UpsertKey | Upsert操作のキーとなるフィールドコード（ブランド型） |
| UpsertPlan | 既存レコードとの比較結果（追加・更新・変更なしの分類） |
| UpsertResult | Upsert操作の実行結果（追加数・更新数・変更なし数） |
| RecordFieldValue | レコードフィールドの値（文字列、文字列配列、ユーザー配列、サブテーブル行配列） |

## エンティティ

### SeedData

シードファイルのパース結果を表すエンティティ。

```typescript
type SeedData = Readonly<{
  key: UpsertKey;
  records: readonly SeedRecord[];
}>;
```

### UpsertPlan

既存レコードとシードデータの比較結果。

```typescript
type UpsertPlan = Readonly<{
  toAdd: readonly SeedRecord[];
  toUpdate: readonly SeedRecordWithId[];
  unchanged: number;
}>;
```

### UpsertResult

Upsert操作の実行結果。

```typescript
type UpsertResult = Readonly<{
  added: number;
  updated: number;
  unchanged: number;
  total: number;
}>;
```

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

### UpsertPlanner

既存レコードとシードデータを比較し、UpsertPlanを生成。キーフィールド値でマッチング、深い比較でunchangedを検出。

## ポート

### RecordManager

kintoneレコード操作の抽象化インターフェース。

```typescript
interface RecordManager {
  getAllRecords(condition?: string): Promise<readonly KintoneRecordForResponse[]>;
  addRecords(records: readonly KintoneRecordForParameter[]): Promise<void>;
  updateRecords(records: readonly { id: string; record: KintoneRecordForParameter }[]): Promise<void>;
}
```

### SeedStorage

シードファイルの読み書きインターフェース。

```typescript
interface SeedStorage {
  get(): Promise<string>;
  update(content: string): Promise<void>;
}
```

## エラーコード

| コード | 説明 |
| --- | --- |
| EMPTY_UPSERT_KEY | Upsertキーが空 |
| EMPTY_SEED_TEXT | シードテキストが空 |
| INVALID_SEED_YAML | YAML構文エラー |
| INVALID_SEED_STRUCTURE | 構造バリデーション失敗 |
| DUPLICATE_KEY_VALUE | キーフィールド値の重複 |
| MISSING_KEY_FIELD | レコードにキーフィールドがない |
