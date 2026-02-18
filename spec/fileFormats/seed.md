# シードデータファイル仕様

## kintone API リファレンス

- [レコード](https://cybozu.dev/ja/kintone/docs/rest-api/records/)
  - [レコードを取得する](https://cybozu.dev/ja/kintone/docs/rest-api/records/get-records/)
  - [レコードを追加する](https://cybozu.dev/ja/kintone/docs/rest-api/records/add-records/)
  - [レコードを更新する](https://cybozu.dev/ja/kintone/docs/rest-api/records/update-records/)
  - [レコードを削除する](https://cybozu.dev/ja/kintone/docs/rest-api/records/delete-records/)

## 概要

シードデータファイルは、kintoneアプリに投入するレコードデータをYAML/JSON形式で定義するファイル。`key`フィールドを指定した場合はUpsert方式（キーフィールドで既存レコードと突合し、存在すれば更新・なければ追加）で反映する。`key`フィールドを省略した場合はInsert-onlyモード（全レコードを単純に追加）で動作する。

## フォーマット

### Upsertモード（keyあり）

```yaml
key: customer_code          # Upsert キーフィールド（kintone で重複禁止設定が必要）
records:
  - customer_code: "C001"
    customer_name: "テスト株式会社"
    priority: "high"                   # RADIO_BUTTON / DROP_DOWN
    tags:                              # CHECK_BOX / MULTI_SELECT
      - "VIP"
      - "長期"
    assignee:                          # USER_SELECT / ORG_SELECT / GROUP_SELECT
      - code: "user1"
    start_date: "2025-01-15"           # DATE
    order_items:                       # SUBTABLE
      - product_name: "商品A"
        quantity: "1"
        price: "1000"
```

### Insert-onlyモード（keyなし）

```yaml
records:
  - customer_name: "テスト株式会社"
    priority: "high"
  - customer_name: "サンプル株式会社"
    priority: "low"
```

### Cleanモード

CLIで `--clean` フラグを付けて実行すると、既存レコードをすべて削除してからシードデータを適用する。Upsert計画はスキップされ、全レコードがInsert（追加）として処理される。`key` の有無に関わらず動作する。

```bash
kintone-migrator seed --clean
kintone-migrator seed --clean --yes   # 確認プロンプトをスキップ
```

#### Cleanモードのフロー

1. `recordManager.deleteAllRecords()` で既存レコードを全削除
2. シードファイルの全レコードを `recordManager.addRecords()` で追加
3. `UpsertSeedOutput` を返却（`deleted` に削除件数が含まれる）

#### 注意事項

- `--clean` と `--capture` は排他的であり、同時に指定した場合は `ValidationError` となる
- 破壊的操作のため、デフォルトで確認プロンプトが表示される（`--yes` でスキップ可能）
- Multi-Appモード（`--all`）では、1回の確認プロンプトで全アプリの実行を開始する

## フィールド定義

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | string | 任意 | Upsertキーとなるフィールドコード（非空文字列）。省略時はInsert-onlyモード |
| `records` | array | 必須 | レコードデータの配列 |

## レコードフィールド値の型マッピング

| kintoneフィールド型 | YAML表現 | 例 |
| --- | --- | --- |
| SINGLE_LINE_TEXT, MULTI_LINE_TEXT, RICH_TEXT | string | `"テスト"` |
| NUMBER | string | `"1000"` |
| RADIO_BUTTON, DROP_DOWN | string | `"high"` |
| CHECK_BOX, MULTI_SELECT | string[] | `["VIP", "長期"]` |
| DATE | string (YYYY-MM-DD) | `"2025-01-15"` |
| TIME | string (HH:mm) | `"09:00"` |
| DATETIME | string (ISO 8601) | `"2025-01-15T09:00:00Z"` |
| LINK | string | `"https://example.com"` |
| USER_SELECT, ORG_SELECT, GROUP_SELECT | object[] with `code` | `[{code: "user1"}]` |
| SUBTABLE | object[] | `[{field1: "val1"}]` |

## システムフィールド

以下のシステムフィールドはkintoneが自動で管理するため、シードデータに含める必要はない。含めた場合でも `capture` 時に自動的に除外される。

| type | 説明 |
| --- | --- |
| `RECORD_NUMBER` | レコード番号 |
| `CREATOR` | 作成者 |
| `CREATED_TIME` | 作成日時 |
| `MODIFIER` | 更新者 |
| `UPDATED_TIME` | 更新日時 |
| `CATEGORY` | カテゴリー |
| `STATUS` | ステータス |
| `STATUS_ASSIGNEE` | 作業者 |

## バリデーションルール

- `key` を指定する場合は非空文字列であること
- `records` は必須・配列であること
- `key` 指定時：各レコードに `key` で指定したフィールドが含まれること
- `key` 指定時：`key` フィールドの値がレコード間で重複しないこと
- `key` 省略時：上記のキーフィールド関連バリデーションはスキップされる
- 数値型の値は文字列に自動変換される

## エラーコード

| シナリオ | エラー型 | コード |
| --- | --- | --- |
| `key` が空 | BusinessRuleError | EMPTY_UPSERT_KEY |
| シードテキストが空 | BusinessRuleError | EMPTY_SEED_TEXT |
| YAML構文エラー | BusinessRuleError | INVALID_SEED_YAML |
| 構造バリデーション失敗 | BusinessRuleError | INVALID_SEED_STRUCTURE |
| キーフィールド値の重複 | BusinessRuleError | DUPLICATE_KEY_VALUE |
| レコードにキーフィールドがない | BusinessRuleError | MISSING_KEY_FIELD |
