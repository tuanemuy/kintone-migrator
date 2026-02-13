# シードデータファイル仕様

## 概要

シードデータファイルは、kintoneアプリに投入するレコードデータをYAML/JSON形式で定義するファイル。Upsert方式（キーフィールド指定で存在すれば更新、なければ追加）でレコードを反映する。

## フォーマット

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

## フィールド定義

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `key` | string | 必須 | Upsertキーとなるフィールドコード（非空文字列） |
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

## バリデーションルール

- `key` は必須・非空文字列であること
- `records` は必須・配列であること
- 各レコードに `key` で指定したフィールドが含まれること
- `key` フィールドの値がレコード間で重複しないこと
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
