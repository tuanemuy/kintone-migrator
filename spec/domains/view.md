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
- `index` は表示順序。kintone API（[update-views](https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/update-views/)）上は**文字列型**だが、本ドメインモデルでは数値として扱い、シリアライズ時に文字列化する（非負整数のみ許容するのは本ツール独自のドメイン制約）
- `name` はビュー名
- `fields` は一覧に表示するフィールドコードのリスト（LISTタイプ）
- `date` はカレンダーに使用する日付フィールドコード（CALENDARタイプ、省略可。省略時 kintone は更新日時を自動設定）
- `title` はカレンダーのタイトルフィールドコード（CALENDARタイプ、省略可。省略時 kintone はレコード番号を自動設定）
- `html` はカスタムビューのHTML（CUSTOMタイプ）
- `pager` はページャーの表示有無
- `filterCond` はフィルター条件
- `sort` はソート条件
- `device` は省略時 `undefined` のまま保持され、kintone 側のデフォルト（`DESKTOP` 相当）に従う。値を明示する場合は `DESKTOP` または `ANY` のみ許容する

#### ビュータイプ別の必須・有効プロパティ

ビュータイプによって意味を持つプロパティが異なる。

| タイプ | 主に使用するプロパティ | 備考 |
| --- | --- | --- |
| `LIST` | `fields` | 一覧に表示するフィールドコードのリスト |
| `CALENDAR` | `date`, `title` | カレンダーの日付・タイトルフィールド。いずれも API 上は省略可（省略時に kintone が更新日時／レコード番号を自動設定） |
| `CUSTOM` | `html` | カスタムビューのHTML |

- `type` はいずれの場合も必須。`LIST`/`CALENDAR`/`CUSTOM` 以外の値は `BusinessRuleError(VW_INVALID_VIEW_TYPE)` をスローする
- `index` は省略可能で、省略時は `0` とする。負数・非整数の場合は `BusinessRuleError(VW_INVALID_INDEX)` をスローする
- `filterCond`/`sort`/`pager` はタイプを問わず指定可能

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

- `DESKTOP`: PC（デスクトップ）のみ表示対象
- `ANY`: PC・モバイル両方を表示対象とする

## ドメインサービス

### ViewConfigParser

パース済みのビュー設定データ（`unknown`）を検証し、`ViewsConfig` に変換する純粋関数。YAMLテキストのパースはアプリケーション層（ConfigCodec）が担い、本関数はその結果である pre-parsed な `unknown` を受け取る。

```typescript
const ViewConfigParser = {
  parse: (parsed: unknown): ViewsConfig;
};
```

- 構造が不正（オブジェクトでない、`views` キーがオブジェクトでない等）な場合は `BusinessRuleError(VW_INVALID_CONFIG_STRUCTURE)` をスローする
- ビュー名が空文字の場合は `BusinessRuleError(VW_EMPTY_VIEW_NAME)` をスローする
- `type` が不正な値の場合は `BusinessRuleError(VW_INVALID_VIEW_TYPE)` をスローする
- `index` が非負整数でない場合は `BusinessRuleError(VW_INVALID_INDEX)` をスローする
- `device` が不正な値の場合は `BusinessRuleError(VW_INVALID_DEVICE_TYPE)` をスローする
- `device` が省略された場合は `undefined` のまま保持する（デフォルト補完しない）
- ViewConfigSerializer が生成するデータとラウンドトリップ整合性を保つ

#### 設定ファイルのフォーマット

[ビュー設定ファイル仕様](../fileFormats/view.md) を参照。

### ViewConfigSerializer

`ViewsConfig` をシリアライズ可能なプレーンオブジェクト（`Record<string, unknown>`）に変換する純粋関数。YAMLテキストへの変換はアプリケーション層（ConfigCodec）が担う。

```typescript
const ViewConfigSerializer = {
  serialize: (config: ViewsConfig): Record<string, unknown>;
};
```

- `views` をビュー名キーのマップとして出力する
- `undefined` のオプションプロパティは出力に含めない

## ポート

### ViewConfigurator

kintoneアプリのビュー設定を取得・更新するためのインターフェース。

```typescript
interface ViewConfigurator {
  getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }>;
  updateViews(params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getViews()` は現在のビュー設定をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateViews()` はビュー設定を更新する（全置換方式）。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### ViewStorage

ビュー設定テキストを永続化・取得するためのインターフェース。

```typescript
interface ViewStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする

## 設定ファイルのフォーマット

[ビュー設定ファイル仕様](../fileFormats/view.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `view apply` | YAML設定ファイルからビュー設定を適用する |
| `view capture` | 現在のビュー設定をYAMLファイルに保存する |
| `view diff` | ローカルのビュー設定とリモートの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--view-file` | `VIEW_FILE_PATH` | ビュー設定ファイルパス（デフォルト: `views.yaml`、マルチアプリ: `view/<appName>.yaml`） |
