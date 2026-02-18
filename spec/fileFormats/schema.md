# スキーマ仕様

kintone フォーム設定を宣言的に定義するスキーマファイルのフォーマット仕様。

## kintone API リファレンス

- [フォーム](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/)
  - [フィールドを取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/get-form-fields/)
  - [フィールドを追加する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/add-form-fields/)
  - [フィールドの設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/update-form-fields/)
  - [フィールドを削除する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/delete-form-fields/)
  - [フォームのレイアウトを取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/get-form-layout/)
  - [フォームのレイアウトを変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/form/update-form-layout/)

## 概要

スキーマは YAML 形式で記述する。ルートオブジェクトの `layout` キー配下にレイアウト要素の配列を定義し、kintone のフォームレイアウト構造に準拠した形式でフィールドと装飾要素を記述する。

## 基本構造

```yaml
layout:
  - type: ROW
    fields:
      - code: field_code
        type: FIELD_TYPE
        label: フィールドラベル
        size: { width: "200" }
        # フィールド型固有のプロパティ...
```

- ルートオブジェクトに `layout` キーを持つ
- `layout` はレイアウトアイテム（`ROW`、`GROUP`、`SUBTABLE`）の配列
- フィールド定義は `code`、`type`、`label` およびフィールド型固有のプロパティをフラットに記述する（`properties` でラップしない）

## レイアウトアイテム

### ROW

フォームの1行を表す。複数のフィールドや装飾要素を横並びに配置できる。

```yaml
- type: ROW
  fields:
    - code: field1
      type: SINGLE_LINE_TEXT
      label: フィールド1
      size: { width: "200" }
    - code: field2
      type: NUMBER
      label: フィールド2
      size: { width: "150" }
```

### GROUP

複数行のフィールドをグループ化する。折りたたみが可能。

```yaml
- type: GROUP
  code: group_code
  label: グループラベル
  openGroup: true          # true: 展開状態 / false: 折りたたみ状態（省略可）
  layout:
    - type: ROW
      fields:
        - code: inner_field
          type: SINGLE_LINE_TEXT
          label: グループ内フィールド
          size: { width: "200" }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | Yes | グループのフィールドコード |
| `label` | string | Yes | グループの表示ラベル |
| `openGroup` | boolean | No | 初期表示時の展開状態 |
| `layout` | ROW[] | Yes | グループ内の行配列（空配列可） |

### SUBTABLE

テーブル形式のフィールドグループ。内部にフィールドを持つ。

```yaml
- type: SUBTABLE
  code: subtable_code
  label: サブテーブルラベル
  fields:
    - code: inner_field1
      type: SINGLE_LINE_TEXT
      label: フィールド1
      size: { width: "200" }
    - code: inner_field2
      type: NUMBER
      label: フィールド2
      size: { width: "150" }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | Yes | サブテーブルのフィールドコード |
| `label` | string | Yes | サブテーブルの表示ラベル |
| `fields` | LayoutElement[] | Yes | サブテーブル内のフィールド配列 |

## フィールド定義

### 共通プロパティ

すべてのフィールド型で使用可能な共通プロパティ。

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | Yes | フィールドコード（一意識別子、空文字列不可） |
| `type` | FieldType | Yes | フィールド型 |
| `label` | string | Yes | フィールドの表示ラベル |
| `noLabel` | boolean | No | `true` の場合、ラベルを非表示にする |
| `size` | ElementSize | No | レイアウト上の表示サイズ |

### ElementSize

```yaml
size:
  width: "200"         # 幅（ピクセル文字列）
  height: "50"         # 高さ（ピクセル文字列、SPACER等で使用）
  innerHeight: "200"   # 内部高さ（ピクセル文字列、MULTI_LINE_TEXT/RICH_TEXT等で使用）
```

### Lookup

`SINGLE_LINE_TEXT`、`NUMBER`、`LINK` フィールドに `lookup` プロパティを指定すると、そのフィールドはルックアップフィールドとして動作する。kintone API ではルックアップは独立したフィールド型ではなく、これらのフィールド型のプロパティとして定義される。

```yaml
lookup:
  relatedApp: { app: "10" }
  relatedKeyField: customer_code
  fieldMappings:
    - { field: name, relatedField: customer_name }
    - { field: address, relatedField: customer_address }
  lookupPickerFields: [customer_name, customer_address]
  filterCond: 'status in ("active")'
  sort: "customer_code asc"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `relatedApp` | RelatedApp | Yes | 参照先アプリ |
| `relatedKeyField` | string | Yes | 参照先アプリのキーフィールドのフィールドコード |
| `fieldMappings` | LookupFieldMapping[] | Yes | フィールドのコピー元・コピー先マッピング |
| `lookupPickerFields` | string[] | Yes | ルックアップピッカーに表示するフィールドコードの配列 |
| `filterCond` | string | No | レコード絞り込み条件 |
| `sort` | string | No | ソート条件 |

**RelatedApp**:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `app` | string | Yes | 参照先アプリのアプリID |
| `code` | string | No | 参照先アプリのアプリコード |

**LookupFieldMapping**:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `field` | string | Yes | 自アプリのコピー先フィールドコード |
| `relatedField` | string | Yes | 参照先アプリのコピー元フィールドコード |

> **注意**: `relatedApp.app` はアプリIDであるため、異なる環境へマイグレーションする場合は、移行先環境のアプリIDに手動で書き換える必要があります。

## フィールド型一覧

### SINGLE_LINE_TEXT（文字列（1行））

```yaml
- code: field_code
  type: SINGLE_LINE_TEXT
  label: ラベル
  size: { width: "200" }
  required: true
  unique: true
  defaultValue: "デフォルト値"
  minLength: "1"
  maxLength: "100"
  expression: "field_a & \" - \" & field_b"   # 自動計算式
  hideExpression: false                         # 計算式を非表示にするか
  lookup:                                       # ルックアップ設定（省略可）
    relatedApp: { app: "10" }
    relatedKeyField: customer_code
    fieldMappings:
      - { field: name, relatedField: customer_name }
      - { field: address, relatedField: customer_address }
    lookupPickerFields: [customer_name, customer_address]
    filterCond: 'status in ("active")'
    sort: "customer_code asc"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `unique` | boolean | No | 値の重複を禁止 |
| `defaultValue` | string | No | デフォルト値 |
| `minLength` | string | No | 最小文字数 |
| `maxLength` | string | No | 最大文字数 |
| `expression` | string | No | 自動計算式 |
| `hideExpression` | boolean | No | 計算式を非表示にするか |
| `lookup` | Lookup | No | ルックアップ設定（指定時、フィールドはルックアップフィールドとして動作する） |

### MULTI_LINE_TEXT（文字列（複数行））

```yaml
- code: field_code
  type: MULTI_LINE_TEXT
  label: ラベル
  size: { width: "500", innerHeight: "200" }
  required: true
  defaultValue: "デフォルト値"
  minLength: "10"
  maxLength: "5000"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | string | No | デフォルト値 |
| `minLength` | string | No | 最小文字数 |
| `maxLength` | string | No | 最大文字数 |

### RICH_TEXT（リッチエディター）

```yaml
- code: field_code
  type: RICH_TEXT
  label: ラベル
  size: { width: "500", innerHeight: "200" }
  required: true
  defaultValue: "<p>初期値</p>"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | string | No | デフォルト値（HTML） |

### NUMBER（数値）

```yaml
- code: field_code
  type: NUMBER
  label: ラベル
  size: { width: "200" }
  required: true
  unique: false
  defaultValue: "0"
  minValue: "0"
  maxValue: "99999999"
  digit: true
  displayScale: "0"
  unit: 円
  unitPosition: AFTER
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `unique` | boolean | No | 値の重複を禁止 |
| `defaultValue` | string | No | デフォルト値 |
| `minValue` | string | No | 最小値 |
| `maxValue` | string | No | 最大値 |
| `digit` | boolean | No | 桁区切りを表示 |
| `displayScale` | string | No | 小数点以下の表示桁数 |
| `unit` | string | No | 単位記号 |
| `unitPosition` | `"BEFORE"` \| `"AFTER"` | No | 単位記号の表示位置 |
| `lookup` | Lookup | No | ルックアップ設定（指定時、フィールドはルックアップフィールドとして動作する） |

### CALC（計算）

```yaml
- code: field_code
  type: CALC
  label: ラベル
  size: { width: "200" }
  expression: "price * quantity"
  format: NUMBER
  displayScale: "0"
  unit: 円
  unitPosition: AFTER
  hideExpression: false
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `expression` | string | Yes | 計算式 |
| `format` | CalcFormat | No | 表示形式 |
| `displayScale` | string | No | 小数点以下の表示桁数（`format: NUMBER` 時） |
| `unit` | string | No | 単位記号（`format: NUMBER` 時） |
| `unitPosition` | `"BEFORE"` \| `"AFTER"` | No | 単位記号の表示位置（`format: NUMBER` 時） |
| `hideExpression` | boolean | No | 計算式を非表示にするか |

**CalcFormat**:

| 値 | 説明 |
| --- | --- |
| `NUMBER` | 数値（デフォルト） |
| `NUMBER_DIGIT` | 数値（桁区切り） |
| `DATE` | 日付 |
| `TIME` | 時刻 |
| `DATETIME` | 日時 |
| `HOUR_MINUTE` | 時間:分 |
| `DAY_HOUR_MINUTE` | 日 時間:分 |

### CHECK_BOX / MULTI_SELECT（複数選択系）

```yaml
- code: field_code
  type: CHECK_BOX      # または MULTI_SELECT
  label: ラベル
  size: { width: "300" }
  required: true
  defaultValue:
    - 選択肢A
  options:
    選択肢A: { label: 選択肢A, index: "0" }
    選択肢B: { label: 選択肢B, index: "1" }
    選択肢C: { label: 選択肢C, index: "2" }
  align: HORIZONTAL
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | string[] | No | デフォルト選択値の配列 |
| `options` | Record<string, SelectionOption> | Yes | 選択肢の定義 |
| `align` | `"HORIZONTAL"` \| `"VERTICAL"` | No | 選択肢の配置方向 |

### RADIO_BUTTON / DROP_DOWN（単一選択系）

```yaml
- code: field_code
  type: RADIO_BUTTON   # または DROP_DOWN
  label: ラベル
  size: { width: "300" }
  required: true
  defaultValue: 選択肢A
  options:
    選択肢A: { label: 選択肢A, index: "0" }
    選択肢B: { label: 選択肢B, index: "1" }
    選択肢C: { label: 選択肢C, index: "2" }
  align: HORIZONTAL
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | string | No | デフォルト選択値（文字列） |
| `options` | Record<string, SelectionOption> | Yes | 選択肢の定義 |
| `align` | `"HORIZONTAL"` \| `"VERTICAL"` | No | 選択肢の配置方向 |

> **注意**: YAML で配列構文（`- value`）を使用した場合でも、パーサーが自動的に文字列に正規化します。

**SelectionOption**:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `label` | string | Yes | 選択肢の表示ラベル |
| `index` | string | Yes | 選択肢の表示順序（"0" 始まり） |

### DATE（日付）

```yaml
- code: field_code
  type: DATE
  label: ラベル
  size: { width: "150" }
  required: true
  unique: false
  defaultValue: "2000-01-01"
  defaultNowValue: true
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `unique` | boolean | No | 値の重複を禁止 |
| `defaultValue` | string | No | デフォルト値（`YYYY-MM-DD` 形式） |
| `defaultNowValue` | boolean | No | `true` の場合、レコード作成時の日付をデフォルトにする |

### TIME（時刻）

```yaml
- code: field_code
  type: TIME
  label: ラベル
  size: { width: "150" }
  required: true
  defaultValue: "18:00"
  defaultNowValue: true
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | string | No | デフォルト値（`HH:mm` 形式） |
| `defaultNowValue` | boolean | No | `true` の場合、レコード作成時の時刻をデフォルトにする |

### DATETIME（日時）

```yaml
- code: field_code
  type: DATETIME
  label: ラベル
  size: { width: "200" }
  required: true
  unique: false
  defaultValue: "2026-01-01T09:00:00Z"
  defaultNowValue: true
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `unique` | boolean | No | 値の重複を禁止 |
| `defaultValue` | string | No | デフォルト値（ISO 8601 形式） |
| `defaultNowValue` | boolean | No | `true` の場合、レコード作成時の日時をデフォルトにする |

### LINK（リンク）

```yaml
- code: field_code
  type: LINK
  label: ラベル
  size: { width: "300" }
  required: true
  unique: true
  defaultValue: "https://example.com"
  minLength: "10"
  maxLength: "500"
  protocol: WEB
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `unique` | boolean | No | 値の重複を禁止 |
| `defaultValue` | string | No | デフォルト値 |
| `minLength` | string | No | 最小文字数 |
| `maxLength` | string | No | 最大文字数 |
| `protocol` | `"WEB"` \| `"CALL"` \| `"MAIL"` | No | リンクの種類 |
| `lookup` | Lookup | No | ルックアップ設定（指定時、フィールドはルックアップフィールドとして動作する） |

### USER_SELECT / ORGANIZATION_SELECT / GROUP_SELECT（ユーザー選択系）

3つのユーザー選択系フィールドは同じプロパティ構造を持つ。

```yaml
- code: field_code
  type: USER_SELECT     # または ORGANIZATION_SELECT / GROUP_SELECT
  label: ラベル
  size: { width: "200" }
  required: true
  defaultValue:
    - { code: admin, type: USER }
    - { code: dev-team, type: GROUP }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `defaultValue` | EntityRef[] | No | デフォルト値のエンティティ参照配列 |
| `entities` | EntityRef[] | No | 選択候補を絞り込むエンティティの配列 |

**EntityRef**:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | Yes | エンティティのコード |
| `type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` | Yes | エンティティの種別 |

### FILE（添付ファイル）

```yaml
- code: field_code
  type: FILE
  label: ラベル
  size: { width: "200" }
  required: true
  thumbnailSize: "250"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `required` | boolean | No | 必須フィールド |
| `thumbnailSize` | string | No | サムネイルサイズ（ピクセル） |

### REFERENCE_TABLE（関連テーブル）

```yaml
- code: field_code
  type: REFERENCE_TABLE
  label: ラベル
  size: { width: "600" }
  referenceTable:
    relatedApp: { app: "42" }
    condition: { field: customer_name, relatedField: name }
    filterCond: 'status in ("active")'
    displayFields: [name, email, phone]
    sort: "name asc"
    size: "5"
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `referenceTable` | ReferenceTableConfig | Yes | 関連テーブルの設定 |

**ReferenceTableConfig**:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `relatedApp` | `{ app: string }` | Yes | 関連先アプリ（アプリIDを文字列で指定） |
| `condition` | `{ field: string, relatedField: string }` | Yes | 紐付け条件（自アプリのフィールドコードと関連先のフィールドコード） |
| `filterCond` | string | No | レコード絞り込み条件 |
| `displayFields` | string[] | Yes | 表示するフィールドコードの配列 |
| `sort` | string | No | ソート条件 |
| `size` | string | No | 表示件数 |

## 装飾要素

ROW 内の `fields` 配列に、フィールドと並べて装飾要素を配置できる。装飾要素は `code` を持たず、`elementId` で識別する。

### LABEL（ラベル）

```yaml
- type: LABEL
  label: セクション見出し
  elementId: heading_1
  size: { width: "400" }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `label` | string | Yes | 表示テキスト |
| `elementId` | string | Yes | 要素ID |
| `size` | ElementSize | Yes | 表示サイズ |

### HR（水平線）

```yaml
- type: HR
  elementId: hr_1
  size: { width: "600" }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `elementId` | string | Yes | 要素ID |
| `size` | ElementSize | Yes | 表示サイズ |

### SPACER（スペーサー）

```yaml
- type: SPACER
  elementId: spacer_1
  size: { width: "200", height: "50" }
```

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `elementId` | string | Yes | 要素ID |
| `size` | ElementSize | Yes | 表示サイズ |

## システムフィールド

以下のシステムフィールドはkintoneがレコードごとに自動で管理するフィールドであり、スキーマに定義しなくてもすべてのレコードに存在する。スキーマで指定するのは **フォーム上に表示したい場合のみ** であり、その場合もレイアウト上の配置情報（`code`, `type`, `size`）のみを保持する。フィールド定義としては管理対象外であり、差分検出・マイグレーション・上書きの対象にならない。

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

レコード番号をフォームに表示する場合の例:

```yaml
- type: ROW
  fields:
    - code: record_number
      type: RECORD_NUMBER
      size: { width: "100" }
```

## パーサーの自動変換

スキーマパース時に以下の自動変換が行われる。

| 変換 | 説明 |
| --- | --- |
| 数値→文字列 | `minLength: 10` のように数値で記述された値は、自動的に文字列 `"10"` に変換される |

## バリデーション

スキーマパース時に以下のバリデーションが実行される。

| エラーコード | 条件 |
| --- | --- |
| `EMPTY_SCHEMA_TEXT` | スキーマテキストが空 |
| `INVALID_SCHEMA_FORMAT` | YAML として不正なテキスト |
| `INVALID_SCHEMA_STRUCTURE` | `layout` キーが存在しない、または配列でない |
| `INVALID_FIELD_TYPE` | 未知のフィールド型 |
| `INVALID_LAYOUT_STRUCTURE` | レイアウト要素の構造が不正 |
| `INVALID_DECORATION_ELEMENT` | 装飾要素の構造が不正（`elementId` の欠落等） |
| `DUPLICATE_FIELD_CODE` | 同一の `code` を持つフィールドが複数存在する |

## JSON フォーマット（参考）

YAML の代替として JSON 形式も使用可能。JSON 形式ではフラット構造の `fields` オブジェクトで定義し、フィールド固有プロパティを `properties` キーでラップする。

```json
{
  "fields": {
    "customer_name": {
      "type": "SINGLE_LINE_TEXT",
      "label": "顧客名",
      "properties": {
        "required": true,
        "unique": true,
        "maxLength": "100"
      }
    }
  }
}
```

### YAML との主な違い

| 観点 | YAML（推奨） | JSON |
| --- | --- | --- |
| ルートキー | `layout` | `fields` |
| 構造 | レイアウトベース（行・グループ・サブテーブル） | フラットなフィールド一覧 |
| プロパティ | フラット（`required: true`） | `properties` でラップ |
| レイアウト情報 | `size` を含む | レイアウト情報なし |
| 装飾要素 | `LABEL`、`HR`、`SPACER` を含む | 含まない |
| システムフィールド | レイアウト上に配置可能 | 含まない |

> JSON フォーマットはレイアウト情報を持たないため、`captureSchema` で生成される YAML フォーマットの使用を推奨する。
