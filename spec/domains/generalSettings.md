# GeneralSettings

## ドメイン名

GeneralSettings

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| 一般設定 | GeneralSettingsConfig | アプリの一般設定の望ましい状態を定義した設定 |
| アイコン設定 | IconConfig | アプリアイコンの設定 |
| タイトルフィールド設定 | TitleFieldConfig | レコードタイトルフィールドの設定 |
| 数値精度設定 | NumberPrecisionConfig | 数値の精度（桁数・小数点・丸め）設定 |

## エンティティ

### GeneralSettingsConfig

アプリの一般設定。すべてのフィールドはオプショナルで、指定されたフィールドのみが更新される。

```typescript
type GeneralSettingsConfig = Readonly<{
  name?: string;
  description?: string;
  icon?: IconConfig;
  theme?: ThemeType;
  titleField?: TitleFieldConfig;
  enableThumbnails?: boolean;
  enableBulkDeletion?: boolean;
  enableComments?: boolean;
  enableDuplicateRecord?: boolean;
  enableInlineRecordEditing?: boolean;
  numberPrecision?: NumberPrecisionConfig;
  firstMonthOfFiscalYear?: number;
}>;
```

- `name` はアプリ名
- `description` はアプリの説明
- `icon` はアプリアイコン
- `theme` はテーマカラー
- `titleField` はレコードタイトルに使用するフィールド
- `enableThumbnails` はサムネイル表示の有効/無効
- `enableBulkDeletion` は一括削除の有効/無効
- `enableComments` はコメント機能の有効/無効
- `enableDuplicateRecord` はレコード複製の有効/無効
- `enableInlineRecordEditing` はインライン編集の有効/無効
- `numberPrecision` は数値の精度設定
- `firstMonthOfFiscalYear` は年度の開始月（1〜12）

## 値オブジェクト

### ThemeType

テーマカラー。

```typescript
type ThemeType = "WHITE" | "RED" | "GREEN" | "BLUE" | "YELLOW" | "BLACK"
  | "CLIPBOARD" | "BINDER" | "PENCIL" | "CLIPS";
```

### IconConfig

アプリアイコンの設定。

```typescript
type IconType = "PRESET" | "FILE";

type IconConfig = Readonly<{
  type: IconType;
  key: string;
}>;
```

### TitleFieldConfig

レコードタイトルフィールドの設定。

```typescript
type TitleFieldSelectionMode = "AUTO" | "MANUAL";

type TitleFieldConfig = Readonly<{
  selectionMode: TitleFieldSelectionMode;
  code?: string;
}>;
```

- `selectionMode` が `MANUAL` の場合、`code` でフィールドコードを指定する

### NumberPrecisionConfig

数値の精度設定。

```typescript
type RoundingMode = "HALF_EVEN" | "UP" | "DOWN";

type NumberPrecisionConfig = Readonly<{
  digits: number;
  decimalPlaces: number;
  roundingMode: RoundingMode;
}>;
```

## ポート

### GeneralSettingsConfigurator

kintoneアプリの一般設定を取得・更新するためのインターフェース。

### GeneralSettingsStorage

一般設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
name: 顧客管理
description: 顧客情報を管理するアプリ
icon:
  type: PRESET
  key: APP006
theme: WHITE
titleField:
  selectionMode: MANUAL
  code: customer_name
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
enableDuplicateRecord: true
enableInlineRecordEditing: true
numberPrecision:
  digits: 16
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
```

## CLI

| コマンド | 説明 |
| --- | --- |
| `settings apply` | YAML設定ファイルからアプリの一般設定を適用する |
| `settings capture` | 現在のアプリの一般設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--settings-file` | `SETTINGS_FILE_PATH` | 一般設定ファイルパス（デフォルト: `settings.yaml`、マルチアプリ: `settings/<appName>.yaml`） |
