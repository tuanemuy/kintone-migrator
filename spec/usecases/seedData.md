# SeedData ユースケース

## upsertSeed

シードファイルのデータをkintoneアプリにUpsert（存在すれば更新、なければ追加）する。`clean` オプションを指定すると、既存レコードを全削除してからシードデータを全追加する。

### 入力

```typescript
type UpsertSeedInput = {
  clean?: boolean;
};
```

### フロー（通常モード）

1. `seedStorage.get()` でシードファイルを読み込む
2. `SeedParser.parse()` でパース・バリデーション
3. `recordManager.getAllRecords()` で既存レコードを取得
4. `RecordConverter.fromKintoneRecord()` で既存レコードをフラット変換
5. `UpsertPlanner.plan()` で追加・更新・変更なしを分類
6. `RecordConverter.toKintoneRecord()` でシードレコードをkintone形式に変換
7. `recordManager.addRecords()` で新規レコードを追加
8. `recordManager.updateRecords()` で既存レコードを更新
9. `UpsertSeedOutput` を返却（`deleted: 0`）

### フロー（cleanモード: `input.clean === true`）

1. `seedStorage.get()` でシードファイルを読み込む
2. `SeedParser.parse()` でパース・バリデーション
3. `recordManager.deleteAllRecords()` で既存レコードを全削除
4. `RecordConverter.toKintoneRecord()` でシードレコードをkintone形式に変換
5. `recordManager.addRecords()` で全レコードを追加（Upsert計画はスキップ）
6. `UpsertSeedOutput` を返却（`deleted` に削除件数が含まれる）

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

1. `recordManager.getAllRecords()` で全レコードを取得
2. `RecordConverter.fromKintoneRecord()` でフラット形式に変換
3. `SeedSerializer.serialize()` でYAMLテキストを生成
4. `seedStorage.get()` で既存シードファイルの有無を確認
5. `CaptureSeedOutput` を返却

### 入力

```typescript
type CaptureSeedInput = {
  keyField: string;
};
```

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
