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
- `filterCond` は実行条件
- `type` はアクションの種別（プライマリ/セカンダリ）
- `executableUser` はアクション実行可能なユーザー

## ポート

### ProcessManagementConfigurator

kintoneアプリのプロセス管理設定を取得・更新するためのインターフェース。

### ProcessManagementStorage

プロセス管理設定テキストを永続化・取得するためのインターフェース。

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
