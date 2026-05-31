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

- `index` は表示順序。**非負整数**（必須）。負数・非整数の場合は `BusinessRuleError(AC_INVALID_CONFIG_STRUCTURE)` をスローする。`actions` 全体で `index` は一意でなければならず、重複する場合は `BusinessRuleError(AC_DUPLICATE_INDEX)` をスローする
- `name` はアクション名。`ActionsConfig.actions` のキー（マップキー）と同一の値であり、設定ファイル上はキーで表現する（[Record のキーと name](#record-のキーと-name) を参照）
- `destApp` はコピー先アプリ
- `mappings` はフィールドマッピングのリスト
- `entities` はアクション実行可能なエンティティのリスト
- `filterCond` は実行条件。省略時は空文字（`""`）とする

#### Record のキーと name

`ActionsConfig.actions` はアクション名をキーとしたマップである。

- マップのキーがアクション名（`ActionConfig.name`）となる。設定ファイルでは `name` プロパティを別途記述せず、キーで名前を表現する
- パース時はキーを `name` に採用し、capture 時もキーにアクション名を出力する（`name` プロパティは出力しない）。これにより name とマップキーの二重表現を避ける
- キーが空文字の場合は `BusinessRuleError(AC_EMPTY_ACTION_NAME)` をスローする

### ActionsConfig

アクション設定の全体。

```typescript
type ActionsConfig = Readonly<{
  actions: Readonly<Record<string, ActionConfig>>;
}>;
```

- `actions` はアクション名をキーとしたアクション定義のマップ

## 値オブジェクト

### ActionDestApp

コピー先アプリの指定。

```typescript
type ActionDestApp = Readonly<{
  app?: string;
  code?: string;
}>;
```

- `app` はコピー先アプリのアプリID（環境固有の数値ID）
- `code` はコピー先アプリのアプリコード（環境に依存しない識別子）
- `app` と `code` のいずれか一方は必須。両方とも未指定の場合は `BusinessRuleError(AC_INVALID_CONFIG_STRUCTURE)` をスローする

#### destApp.app（環境固有ID）の解決規則

`destApp.app` はアプリIDであり、開発・本番など環境ごとに異なる**環境固有の値**である。本ツールは ID の自動変換（環境間マッピング）を行わない。

- capture では kintone API が返す `destApp` をそのまま取り込む（`app`・`code` の両方が返ればそのまま保持する）
- apply ではファイルに記述された `destApp` をそのままリモートへ送信する。`app` を記述する場合、その値は apply 対象の環境で有効なアプリIDでなければならない
- 環境間で設定を移行する場合は、環境に依存しない `code`（アプリコード）でコピー先を指定することが推奨される。`code` を用いることで、環境固有の `app`（アプリID）の付け替えを避けられる

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

- `srcType` が `FIELD` の場合、`srcField` でコピー元フィールドを指定する。`srcField` が無い場合は `BusinessRuleError(AC_INVALID_CONFIG_STRUCTURE)` をスローする
- `srcType` が `RECORD_URL` の場合、レコードURLがコピーされる（`srcField` は不要）
- `destField` はコピー先フィールドコード（必須・空文字不可）
- `srcType` が不正な値の場合は `BusinessRuleError(AC_INVALID_SRC_TYPE)` をスローする

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

```typescript
interface ActionConfigurator {
  getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }>;
  updateActions(params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getActions()` は現在のアクション設定（アクション名キーのマップ）をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateActions()` はアクション設定を**全置換**で更新する（[apply の更新戦略](#apply-の更新戦略) を参照）。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

#### apply の更新戦略

apply はアクション設定を**全置換（full replacement）**で反映する。

- apply は設定ファイルに定義された `actions` マップ全体を `updateActions()` に渡し、リモートのアクション設定を丸ごと置き換える（マージではない）
- したがって、設定ファイルに存在しないアクションはリモートからも削除される。リモートに残したいアクションは設定ファイルにすべて記述しておく必要がある
- capture で取得した現在の `revision` を `updateActions()` に引き渡すことで、取得から更新までの間にリモートが変更されていないことを保証する

### ActionStorage

アクション設定テキストを永続化・取得するためのインターフェース。

```typescript
interface ActionStorage {
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

[アクション設定ファイル仕様](../fileFormats/action.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `action apply` | YAML設定ファイルからアクション設定を適用する |
| `action capture` | 現在のアクション設定をYAMLファイルに保存する |
| `action diff` | ローカルのアクション設定とリモートの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--action-file` | `ACTION_FILE_PATH` | アクション設定ファイルパス（デフォルト: `actions.yaml`、マルチアプリ: `action/<appName>.yaml`） |
