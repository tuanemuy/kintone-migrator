# ProcessManagement

## ドメイン名

ProcessManagement

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| プロセス管理設定 | ProcessManagementConfig | プロセス管理（ワークフロー）の望ましい状態を定義した設定 |
| プロセスステータス | ProcessState | ワークフローのステータス定義 |
| プロセスアクション | ProcessAction | ステータス間の遷移アクション定義 |
| 担当者設定 | ProcessAssignee | ステータスの担当者設定 |

## エンティティ

### ProcessState

ワークフローのステータス定義。

```typescript
type ProcessState = Readonly<{
  index: number;
  assignee: ProcessAssignee;
}>;
```

- `index` はステータスの表示順序
- `assignee` は担当者設定

### ProcessManagementConfig

プロセス管理の全体設定。

```typescript
type ProcessManagementConfig = Readonly<{
  enable: boolean;
  states: Readonly<Record<string, ProcessState>>;
  actions: readonly ProcessAction[];
}>;
```

- `enable` はプロセス管理の有効/無効
- `states` はステータス名をキーとしたステータス定義のマップ
- `actions` はアクション（ステータス遷移）のリスト

#### states と actions の参照整合性

`states` のキー（ステータス名）と `actions` の `from`/`to` は相互に整合していなければならない。

- すべての `action.from` は `states` のキーに存在するステータス名でなければならない。存在しない場合は `BusinessRuleError(PM_INVALID_ACTION_REFERENCE)` をスローする
- すべての `action.to` は `states` のキーに存在するステータス名でなければならない。存在しない場合は `BusinessRuleError(PM_INVALID_ACTION_REFERENCE)` をスローする
- `actions` 内でアクション名（`name`）は一意でなければならない。重複する場合は `BusinessRuleError(PM_DUPLICATE_ACTION_NAME)` をスローする

## 値オブジェクト

### ProcessEntityType

プロセス関連エンティティの種別。

```typescript
type ProcessEntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY" | "CREATOR" | "CUSTOM_FIELD";
```

### ProcessAssigneeType

担当者の割り当て方式。

```typescript
type ProcessAssigneeType = "ONE" | "ALL" | "ANY";
```

- `ONE` は1人の担当者
- `ALL` は全員が処理する必要がある
- `ANY` は誰か1人が処理すればよい

### ProcessEntity

プロセスに関わるエンティティの識別情報。

```typescript
type ProcessEntity = Readonly<{
  type: ProcessEntityType;
  code?: string;
  includeSubs?: boolean;
}>;
```

- `type` は必須
- `code` はエンティティ識別子（ユーザーコード・グループコード・組織コード・フィールドコード等）
    - `USER` / `GROUP` / `ORGANIZATION` / `FIELD_ENTITY` / `CUSTOM_FIELD` では対象を識別するために `code` を指定する
    - `CREATOR`（レコード作成者）は識別子を必要としないため `code` を省略できる
    - `code` を指定した場合は文字列として保持し、省略時は `undefined` のまま保持する（デフォルト補完しない）
- `includeSubs` はサブ組織を含めるかどうか（オプション、省略時 `false`）
    - kintone API（[update-process-management-settings](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-process-management-settings/)）の仕様では、`ORGANIZATION` および**組織選択フィールドを指定した `FIELD_ENTITY`** のときのみ意味を持つ（それ以外の type では無視される）
    - 真偽値以外が指定された場合は `BusinessRuleError(PM_INVALID_BOOLEAN_FIELD)` をスローする
    - 省略時は `undefined` のまま保持する（デフォルト補完しない）

### ProcessAssignee

ステータスの担当者設定。

```typescript
type ProcessAssignee = Readonly<{
  type: ProcessAssigneeType;
  entities: readonly ProcessEntity[];
}>;
```

### ProcessAction

ステータス間の遷移アクション。

```typescript
type ProcessActionType = "PRIMARY" | "SECONDARY";

type ProcessAction = Readonly<{
  name: string;
  from: string;
  to: string;
  filterCond: string;
  type: ProcessActionType;
  executableUser?: Readonly<{
    entities: readonly ProcessEntity[];
  }>;
}>;
```

- `name` はアクション名
- `from` は遷移元ステータス名
- `to` は遷移先ステータス名
- `from`/`to` は `states` のキーに存在するステータス名でなければならない（[states と actions の参照整合性](#states-と-actions-の参照整合性) を参照）
- `filterCond` は実行条件。省略時は空文字（`""`）とする
- `type` はアクションの種別（プライマリ/セカンダリ）。省略時は `PRIMARY` とする
- `executableUser` はアクション実行可能なユーザー。`type` が `SECONDARY` の場合にのみ意味を持ち保持される

## ドメインサービス

### ProcessManagementConfigParser

パース済みのプロセス管理設定データ（`unknown`）を検証し、`ProcessManagementConfig` に変換する純粋関数。YAMLテキストのパースはアプリケーション層（ConfigCodec）が担い、本関数はその結果である pre-parsed な `unknown` を受け取る。

```typescript
const ProcessManagementConfigParser = {
  parse: (parsed: unknown): ProcessManagementConfig;
};
```

- 構造が不正な場合は `BusinessRuleError(PM_INVALID_CONFIG_STRUCTURE)` をスローする
- `enable` が真偽値でない場合は `BusinessRuleError(PM_INVALID_BOOLEAN_FIELD)` をスローする。省略時は `false` とする
- `assignee.type` が不正な場合は `BusinessRuleError(PM_INVALID_ASSIGNEE_TYPE)` をスローする
- エンティティの `type` が不正な場合は `BusinessRuleError(PM_INVALID_ENTITY_TYPE)` をスローする
- `includeSubs` が真偽値でない場合は `BusinessRuleError(PM_INVALID_BOOLEAN_FIELD)` をスローする
- アクション名が重複する場合は `BusinessRuleError(PM_DUPLICATE_ACTION_NAME)` をスローする
- `action.from`/`action.to` が `states` に存在しないステータスを参照する場合は `BusinessRuleError(PM_INVALID_ACTION_REFERENCE)` をスローする
- ProcessManagementConfigSerializer が生成するデータとラウンドトリップ整合性を保つ

#### 設定ファイルのフォーマット

[プロセス管理設定ファイル仕様](../fileFormats/processManagement.md) を参照。

### ProcessManagementConfigSerializer

`ProcessManagementConfig` をシリアライズ可能なプレーンオブジェクト（`Record<string, unknown>`）に変換する純粋関数。YAMLテキストへの変換はアプリケーション層（ConfigCodec）が担う。

```typescript
const ProcessManagementConfigSerializer = {
  serialize: (config: ProcessManagementConfig): Record<string, unknown>;
};
```

- `enable`・`states`・`actions` を出力する
- `code`・`includeSubs`・`executableUser` などオプションプロパティは値が存在する場合のみ出力する

## ポート

### ProcessManagementConfigurator

kintoneアプリのプロセス管理設定を取得・更新するためのインターフェース。

```typescript
interface ProcessManagementConfigurator {
  getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }>;
  updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getProcessManagement()` は現在のプロセス管理設定をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateProcessManagement()` はプロセス管理設定を更新する。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### ProcessManagementStorage

プロセス管理設定テキストを永続化・取得するためのインターフェース。

```typescript
interface ProcessManagementStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする

## 設定ファイルのフォーマット

[プロセス管理設定ファイル仕様](../fileFormats/processManagement.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `process apply` | YAML設定ファイルからプロセス管理設定を適用する |
| `process capture` | 現在のプロセス管理設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--process-file` | `PROCESS_FILE_PATH` | プロセス管理設定ファイルパス（デフォルト: `process.yaml`、マルチアプリ: `process/<appName>.yaml`） |
