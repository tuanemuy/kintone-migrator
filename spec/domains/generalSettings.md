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

アプリの一般設定。すべてのフィールドはオプショナルで、設定ファイルに記述された（`undefined` でない）フィールドのみが更新対象となる。

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
- `firstMonthOfFiscalYear` は年度の開始月（1〜12）。整数以外・範囲外の場合は `BusinessRuleError(GS_INVALID_CONFIG_STRUCTURE)` をスローする

#### 部分更新セマンティクス

一般設定は kintone の update-app-settings API がトップレベルのキー単位で部分更新に対応しているため、本ドメインも同じ粒度で部分更新を行う。

- トップレベルのプロパティ（`name`・`theme`・`enableComments` などおよびネスト値オブジェクトである `icon`・`titleField`・`numberPrecision`）は、設定ファイルに記述されたものだけが更新される。未記述（`undefined`）のプロパティはリモートの現在値を保持し、更新リクエストにも含めない
- ネスト値オブジェクト（`icon`・`titleField`・`numberPrecision`）は「プロパティ単位で部分更新される最小単位」ではなく、指定された場合にオブジェクト全体が置換される。したがってネスト内の子プロパティ（例: `numberPrecision.roundingMode` のみ）を単独で部分更新することはできず、ネスト値オブジェクトを指定する場合はそのオブジェクトに必要な子プロパティをすべて記述しなければならない
    - `icon` は `type`・`key` の両方が必須
    - `titleField` は `selectionMode` が必須。`selectionMode` が `MANUAL` の場合は `code` も指定する（`AUTO` の場合 `code` は無視される）
    - `numberPrecision` は `digits`・`decimalPlaces`・`roundingMode` の3つすべてが必須
- 未指定のネスト値オブジェクトはリモート値をそのまま維持し、空オブジェクトで上書きされることはない

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

```typescript
interface GeneralSettingsConfigurator {
  getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }>;
  updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getGeneralSettings()` は現在の一般設定をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateGeneralSettings()` は一般設定を部分更新する（[部分更新セマンティクス](#部分更新セマンティクス) を参照）。`config` に含まれるプロパティのみを更新リクエストに含める。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- apply は capture で取得した現在の `revision` を `updateGeneralSettings()` に引き渡すことで、取得から更新までの間にリモートが変更されていないことを保証する
- API通信に失敗した場合は `SystemError` をスローする

### GeneralSettingsStorage

一般設定テキストを永続化・取得するためのインターフェース。

```typescript
interface GeneralSettingsStorage {
  get(): Promise<
    { exists: true; content: string } | { exists: false }
  >;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする

## 設定ファイルのフォーマット

[一般設定ファイル仕様](../fileFormats/generalSettings.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `settings apply` | YAML設定ファイルからアプリの一般設定を適用する |
| `settings capture` | 現在のアプリの一般設定をYAMLファイルに保存する |
| `settings diff` | ローカルの一般設定とリモートの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--settings-file` | `SETTINGS_FILE_PATH` | 一般設定ファイルパス（デフォルト: `settings.yaml`、マルチアプリ: `settings/<appName>.yaml`） |
