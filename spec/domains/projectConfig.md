# ProjectConfig ドメイン

## 概要

複数のkintoneアプリを一括管理するためのプロジェクト設定を扱うドメイン。設定ファイルのパース、バリデーション、依存関係の解決を担当する。

## ユビキタス言語

| 用語 | 説明 |
| --- | --- |
| ProjectConfig | プロジェクト設定全体（共通設定 + アプリ定義の集合） |
| AppEntry | 個別のアプリ定義（appId, schemaFile, 接続設定, 依存関係） |
| AppName | アプリの識別名（ブランド型） |
| ExecutionPlan | 依存関係に基づいて順序付けされたアプリの実行計画 |
| MultiAppResult | 複数アプリの実行結果（成功/失敗/スキップ） |
| DependencyResolver | トポロジカルソートで実行順序を解決するサービス |
| ConfigParser | YAML設定ファイルをProjectConfigにパースするサービス |

## エンティティ

### ProjectConfig

プロジェクト設定全体を表すエンティティ。

```typescript
type ProjectConfig = {
  domain?: string;
  auth?: AuthConfig;
  guestSpaceId?: string;
  apps: ReadonlyMap<AppName, AppEntry>;
};
```

### AppEntry

個別のアプリ設定を表すエンティティ。各設定領域のファイルパスを**フラットな `xxxFile` フィールド**として保持する。これはパース後の YAML 構造との 1:1 対応を保つための意図的な設計であり、ファイル仕様の `files` オブジェクト（[projectConfig ファイル仕様](../fileFormats/projectConfig.md) 参照）はパース時にこのフラット構造へ正規化される。グループ化されたパスアクセスが必要な場合はドメインサービス `AppFilePaths`（`buildAppFilePaths`）を用いる。

```typescript
type AppEntry = Readonly<{
  name: AppName;
  appId: string;
  // 各設定領域のファイルパス（すべて任意。省略時は規約ベースのデフォルトを適用）
  schemaFile?: string;
  seedFile?: string;
  customizeFile?: string;
  fieldAclFile?: string;
  viewFile?: string;
  appAclFile?: string;
  recordAclFile?: string;
  processFile?: string;
  settingsFile?: string;
  notificationFile?: string;
  reportFile?: string;
  actionFile?: string;
  adminNotesFile?: string;
  pluginFile?: string;
  domain?: string;
  auth?: AuthConfig;
  guestSpaceId?: string;
  dependsOn: readonly AppName[];
}>;
```

- ファイルパスフィールドは**ドメインモデル上はフラット**で保持する。ファイル仕様側の `files` オブジェクトはあくまで YAML 上の表現であり、ConfigParser がフラット構造へ変換する。ファイル仕様で「非推奨」とされるのは YAML の**フラットなトップレベル記法**（`schemaFile:` 等を `files` でラップせず直接書く形式）であって、本ドメインモデルのフラット保持とは別の話である点に注意する。

### AppFilePaths（ドメインサービス）

アプリ名から各設定領域のファイルパスを規約ベースで導出する。`AppEntry` のフラットなパスフィールドをグループ化して扱うためのビュー。

```typescript
type AppFilePaths = Readonly<{
  schema: string; seed: string; customize: string; view: string;
  settings: string; notification: string; report: string; action: string;
  process: string; fieldAcl: string; appAcl: string; recordAcl: string;
  adminNotes: string; plugin: string;
}>;

function buildAppFilePaths(appName: AppName, baseDir?: string): AppFilePaths;
```

### ExecutionPlan

依存関係に基づいた実行順序を保持するエンティティ。

```typescript
type ExecutionPlan = {
  orderedApps: readonly AppEntry[];
};
```

### MultiAppResult

複数アプリの実行結果を保持するエンティティ。

```typescript
type MultiAppResult = {
  results: readonly AppExecutionResult[];
  hasFailure: boolean;
};
```

## 値オブジェクト

### AppName

アプリの識別名を表すブランド型。設定ファイルの `apps` マップのキーであり、ファイルパスのデフォルト導出（`buildAppFilePaths`）にも使われるため、ファイルシステム上安全な文字列であることを `AppName.create` で検証する。

```typescript
const AppName = {
  create: (name: string): AppName;
};
```

検証ルール:
- 空文字列は不可（`PC_EMPTY_APP_NAME`）
- パス区切り・予約文字 `/ \ : * ? " < > |` を含む場合は不可（`PC_INVALID_APP_NAME`）
- 制御文字を含む場合は不可（`PC_INVALID_APP_NAME`）
- `.` または `..`（予約パス要素）は不可（`PC_INVALID_APP_NAME`）

### AuthConfig

認証設定を表す Discriminated Union 型。

```typescript
type AuthConfig =
  | { readonly type: "apiToken"; readonly apiToken: string }
  | { readonly type: "password"; readonly username: string; readonly password: string };
```

- `apiToken`: APIトークンによる認証
- `password`: ユーザー名・パスワードによる認証

```typescript
type AppName = string & { readonly brand: "AppName" };
```

## ドメインサービス

### DependencyResolver

Kahn's algorithm（BFSトポロジカルソート）を使用して実行順序を解決する。

- 同一レベルのアプリはアルファベット順
- 循環依存を検出してエラー報告
- 存在しないアプリへの参照を検出してエラー報告

### ConfigParser

YAML形式のプロジェクト設定をパースし、バリデーションを実行してProjectConfigを生成する。

バリデーション:
- `apps` は必須で空でないオブジェクト
- 各アプリに `appId` が必須
- `domain` と `auth` はCLI引数・環境変数・設定ファイルのいずれかで実行時に解決される（設定ファイル内では任意）

#### auth の判別ロジック（ファイル形式 → AuthConfig）

設定ファイルの `auth` は discriminator `type` を持たず、`apiToken` / `username` / `password` を直接記述する（[projectConfig ファイル仕様](../fileFormats/projectConfig.md) 参照）。ConfigParser は以下の規則で `AuthConfig` の Discriminated Union へ変換する。

判別は `apiToken` の有無を最優先する。以下の順序で評価する。

| 評価順 | 設定ファイルの `auth` の内容 | 導出される `AuthConfig` |
| --- | --- | --- |
| 1 | `apiToken` がある（非空） | `{ type: "apiToken", apiToken }`（`username`/`password` の有無は一切チェックせず無視する） |
| 1' | `apiToken` がある（trim 後 0 文字の空文字） | エラー（`INVALID_AUTH`） |
| 2 | `apiToken` が無く `username` と `password` の両方がある | `{ type: "password", username, password }` |
| 2' | `apiToken` が無く `username`（trim 後）または `password` が空 | エラー（`INVALID_AUTH`） |
| 3 | `apiToken` が無く、`username`/`password` が揃わない（片方のみ／いずれも無い） | エラー（`INVALID_AUTH`、`"Auth must have either apiToken or username/password"`） |
| - | `auth` 自体が未指定 | 設定ファイルでは未解決とし、CLI引数・環境変数で解決する（ここではエラーにしない） |

- `apiToken` がある場合は `username`/`password` を併記していてもエラーにせず、apiToken 型を優先する。両者を矛盾とは扱わない。
- `apiToken` と `username` は trim して評価する。`password` は trim しない（先頭・末尾の空白が有効なパスワードであり得るため）。
- 上記エラーはいずれもエラーコード `PC_INVALID_AUTH_CONFIG`。`BusinessRuleError`（ドメイン層）として throw し、アプリケーション層で `ValidationError` に変換する。

## エラーコード

エラーコードは `PC_` プレフィックスを持つ（実装 `src/core/domain/projectConfig/errorCode.ts` と一致）。

| コード | 説明 |
| --- | --- |
| PC_CIRCULAR_DEPENDENCY | 循環依存が検出された |
| PC_UNKNOWN_DEPENDENCY | 存在しないアプリへの依存参照 |
| PC_EMPTY_APPS | apps が空 |
| PC_EMPTY_APP_ID | appId が空 |
| PC_EMPTY_APP_NAME | アプリ名（マップのキー）が空 |
| PC_INVALID_APP_NAME | アプリ名にパス区切り文字・制御文字・予約パス要素（`.` / `..`）など不正な文字が含まれる |
| PC_INVALID_CONFIG_STRUCTURE | 設定ファイルの構造が不正（オブジェクトでない、`apps` を持たない等） |
| PC_INVALID_AUTH_CONFIG | auth の指定が不正（apiToken が空文字、username/password の片方のみ、いずれも未指定、または空文字を含む） |

`PC_INVALID_AUTH_CONFIG` は本ドキュメント中で `INVALID_AUTH` と略記する場合がある。
