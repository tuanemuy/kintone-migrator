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

個別のアプリ設定を表すエンティティ。

```typescript
type AppEntry = {
  name: AppName;
  appId: string;
  schemaFile: string;
  domain?: string;
  auth?: AuthConfig;
  guestSpaceId?: string;
  dependsOn: readonly AppName[];
};
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

アプリの識別名を表すブランド型。

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
- `domain` と `auth` はトップレベルまたはアプリ単位で最低1つ必要

## エラーコード

| コード | 説明 |
| --- | --- |
| CIRCULAR_DEPENDENCY | 循環依存が検出された |
| UNKNOWN_DEPENDENCY | 存在しないアプリへの依存参照 |
| EMPTY_APPS | apps が空 |
| EMPTY_APP_ID | appId が空 |
| MISSING_DOMAIN | domain が未設定 |
| MISSING_AUTH | auth が未設定 |
