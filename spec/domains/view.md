# View

## ドメイン名

View

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| ビュー設定 | ViewsConfig | 一覧（ビュー）の望ましい状態を定義した設定 |
| ビュー | ViewConfig | 個別のビュー定義 |
| ビュータイプ | ViewType | ビューの種類（LIST, CALENDAR, CUSTOM） |
| デバイスタイプ | DeviceType | 表示対象デバイス（DESKTOP, ANY） |

## エンティティ

### ViewConfig

個別のビュー定義。

```typescript
type ViewConfig = Readonly<{
  type: ViewType;
  index: number;
  name: string;
  builtinType?: string;
  fields?: readonly string[];
  date?: string;
  title?: string;
  html?: string;
  pager?: boolean;
  device?: DeviceType;
  filterCond?: string;
  sort?: string;
}>;
```

- `type` はビューの種類
- `index` は表示順序
- `name` はビュー名
- `fields` は一覧に表示するフィールドコードのリスト（LISTタイプ）
- `date` はカレンダーに使用する日付フィールドコード（CALENDARタイプ）
- `title` はカレンダーのタイトルフィールドコード（CALENDARタイプ）
- `html` はカスタムビューのHTML（CUSTOMタイプ）
- `pager` はページャーの表示有無
- `filterCond` はフィルター条件
- `sort` はソート条件

### ViewsConfig

ビュー設定の全体を定義する設定。

```typescript
type ViewsConfig = Readonly<{
  views: Readonly<Record<string, ViewConfig>>;
}>;
```

- `views` はビュー名をキーとしたビュー定義のマップ

## 値オブジェクト

### ViewType

ビューの種類。

```typescript
type ViewType = "LIST" | "CALENDAR" | "CUSTOM";
```

### DeviceType

表示対象デバイス。

```typescript
type DeviceType = "DESKTOP" | "ANY";
```

## ポート

### ViewConfigurator

kintoneアプリのビュー設定を取得・更新するためのインターフェース。

### ViewStorage

ビュー設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[ビュー設定ファイル仕様](../fileFormats/view.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `view apply` | YAML設定ファイルからビュー設定を適用する |
| `view capture` | 現在のビュー設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--view-file` | `VIEW_FILE_PATH` | ビュー設定ファイルパス（デフォルト: `views.yaml`、マルチアプリ: `view/<appName>.yaml`） |
