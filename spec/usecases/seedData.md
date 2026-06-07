# SeedData ユースケース

## upsertSeed

シードファイルのデータをkintoneアプリにUpsert（存在すれば更新、なければ追加）する。`clean` オプションを指定すると、既存レコードを全削除してからシードデータを全追加する。

### 入力

```typescript
type UpsertSeedInput = {
  clean?: boolean;
};
```

### フロー（通常モード: `key !== null` かつ `clean !== true`）

1. `seedStorage.get()` でシードファイルを読み込む
2. `SeedParser.parse()` でパース・バリデーション
3. `recordManager.getAllRecords()` で既存レコードを取得（フラット形式 `SeedRecordWithId` で返る。kintone 型 → ドメイン型変換はアダプター内の `RecordConverter` が担う）
4. `UpsertPlanner.plan()` で追加・更新・変更なしを分類（受け取るのはフラット変換済みの `SeedRecordWithId` であり、内部で `RecordConverter` 変換は行わない）
5. `recordManager.addRecords()` で新規レコード（`plan.toAdd`）を追加
6. `recordManager.updateRecords()` で既存レコード（`plan.toUpdate`）を更新
7. `UpsertSeedOutput` を返却（`deleted: 0`）

> usecase/ポート境界ではドメイン型 `SeedRecord` / `SeedRecordWithId` のみを扱い、Kintone 型⇔ドメイン型の変換はアダプター層（`RecordManager` 実装）内で完結する。usecase 層で `RecordConverter` を呼ぶことはない。

### フロー（key未指定モード: `key === null` かつ `clean !== true`）

1. `seedStorage.get()` でシードファイルを読み込む
2. `SeedParser.parse()` でパース・バリデーション
3. `recordManager.addRecords()` で全シードレコードを追加（既存レコードとの比較はスキップ。Kintone 型変換はアダプター層で完結）
4. `UpsertSeedOutput` を返却（`updated: 0, unchanged: 0, deleted: 0`）

### フロー（cleanモード: `input.clean === true`）

1. `seedStorage.get()` でシードファイルを読み込む
2. `SeedParser.parse()` でパース・バリデーション
3. `recordManager.deleteAllRecords()` で既存レコードを全削除
4. `recordManager.addRecords()` で全シードレコードを追加（Upsert計画はスキップ。Kintone 型変換はアダプター層で完結）
5. `UpsertSeedOutput` を返却（`deleted` に削除件数が含まれる）

### 出力

```typescript
type UpsertSeedOutput = {
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  total: number;
};
```

## captureSeed

kintoneアプリの全レコードをキャプチャし、シードデータ形式のYAMLテキストを生成する。

### フロー

1. `recordManager.getAllRecords()` で全レコードを取得（フラット形式 `SeedRecordWithId` で返る。kintone 型 → フラット変換および除外システムフィールドの除去はアダプター内の `RecordConverter` が担う）
2. `SeedSerializer.serialize()` でYAMLテキストを生成
3. `seedStorage.get()` で既存シードファイルの有無を確認
4. `CaptureSeedOutput` を返却

### 入力

```typescript
type CaptureSeedInput = {
  keyField?: string;
};
```

- `keyField` は任意。指定された場合のみ生成される YAML の `key` フィールドに反映される。未指定の場合は `key: null`（Upsertキーなし）として出力される

### 出力

```typescript
type CaptureSeedOutput = {
  seedText: string;
  recordCount: number;
  hasExistingSeed: boolean;
};
```

## saveSeed

シリアライズ済みテキストをシードファイルに保存する。

### フロー

1. `seedStorage.update(seedText)` でファイルに書き込む
