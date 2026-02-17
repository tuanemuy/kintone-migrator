# Action

## ドメイン名

Action

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| アクション設定 | ActionsConfig | アクションの望ましい状態を定義した設定 |
| アクション | ActionConfig | 個別のアクション定義 |
| コピー先アプリ | ActionDestApp | アクションのコピー先アプリ |
| フィールドマッピング | ActionMapping | コピー元とコピー先のフィールド対応関係 |

## エンティティ

### ActionConfig

個別のアクション定義。

```typescript
type ActionConfig = Readonly<{
  index: number;
  name: string;
  destApp: ActionDestApp;
  mappings: readonly ActionMapping[];
  entities: readonly ActionEntity[];
  filterCond: string;
}>;
```

- `index` は表示順序
- `name` はアクション名
- `destApp` はコピー先アプリ
- `mappings` はフィールドマッピングのリスト
- `entities` はアクション実行可能なエンティティのリスト
- `filterCond` は実行条件

### ActionsConfig

アクション設定の全体。

```typescript
type ActionsConfig = Readonly<{
  actions: Readonly<Record<string, ActionConfig>>;
}>;
```

## 値オブジェクト

### ActionDestApp

コピー先アプリの指定。

```typescript
type ActionDestApp = Readonly<{
  app?: string;
  code?: string;
}>;
```

### ActionMapping

フィールドマッピング。

```typescript
type ActionMappingSrcType = "FIELD" | "RECORD_URL";

type ActionMapping = Readonly<{
  srcType: ActionMappingSrcType;
  srcField?: string;
  destField: string;
}>;
```

- `srcType` が `FIELD` の場合、`srcField` でコピー元フィールドを指定する
- `srcType` が `RECORD_URL` の場合、レコードURLがコピーされる

### ActionEntity

アクション実行可能なエンティティ。

```typescript
type ActionEntityType = "USER" | "GROUP" | "ORGANIZATION";

type ActionEntity = Readonly<{
  type: ActionEntityType;
  code: string;
}>;
```

## ポート

### ActionConfigurator

kintoneアプリのアクション設定を取得・更新するためのインターフェース。

### ActionStorage

アクション設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
actions:
  案件コピー:
    index: 0
    destApp:
      app: "20"
    mappings:
      - srcType: FIELD
        srcField: customer_name
        destField: customer_name
      - srcType: FIELD
        srcField: amount
        destField: amount
      - srcType: RECORD_URL
        destField: source_url
    entities:
      - type: USER
        code: admin_user
      - type: GROUP
        code: sales_team
    filterCond: status in ("approved")
```

## CLI

| コマンド | 説明 |
| --- | --- |
| `action apply` | YAML設定ファイルからアクション設定を適用する |
| `action capture` | 現在のアクション設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--action-file` | `ACTION_FILE_PATH` | アクション設定ファイルパス（デフォルト: `actions.yaml`、マルチアプリ: `action/<appName>.yaml`） |
