# ProjectConfig ユースケース

## loadProjectConfig

### 概要

設定ファイルを読み込み、パースし、バリデーションを実行してProjectConfigを返す。

### 入力

```typescript
type LoadProjectConfigInput = {
  content: string;
};
```

- ファイルの読み込みはCLI層の責務であり、本ユースケースにはYAMLテキストが渡される

### 処理フロー

1. 渡されたテキストをYAML形式としてパースする
2. ConfigParserでProjectConfigに変換＆バリデーション
3. ProjectConfigを返す

### エラーケース

- ファイルが見つからない場合: `ValidationError` (INVALID_INPUT)
- YAML構文エラーの場合: `ValidationError` (INVALID_INPUT)
- バリデーション失敗の場合: `BusinessRuleError` (各エラーコード)

---

## resolveExecutionPlan

### 概要

ProjectConfigとCLI引数から実行対象のアプリを決定し、依存関係に基づいた実行計画を返す。

### 入力

```typescript
type ResolveExecutionPlanInput = {
  config: ProjectConfig;
  appName?: string;  // --app で指定されたアプリ名
  all?: boolean;     // --all フラグ
};
```

### 処理フロー

1. `appName` が指定された場合、該当アプリのみのExecutionPlanを返す
2. `all` が指定された場合、全アプリをトポロジカルソートしてExecutionPlanを返す

### エラーケース

- 指定されたアプリが見つからない場合: `NotFoundError` (APP_NOT_FOUND)
- 循環依存が検出された場合: `BusinessRuleError` (CIRCULAR_DEPENDENCY)

---

## executeMultiApp

### 概要

ExecutionPlanに基づいて複数アプリを順番に実行する。Fail-Fast方式で、失敗時は即停止し残りのアプリをスキップする。

### 入力

```typescript
type ExecutionPlan;                            // 実行計画
type MultiAppExecutor = (app: AppEntry) => Promise<void>;  // 各アプリの実行関数
```

### 処理フロー

1. ExecutionPlanの順序でアプリを順番に処理する
2. 各アプリに対してexecutor関数を呼び出す
3. 成功した場合、結果を「succeeded」として記録する
4. 失敗した場合、結果を「failed」として記録し、残りのアプリは「skipped」にする
5. MultiAppResultを返す

### 出力

```typescript
type MultiAppResult = {
  results: readonly AppExecutionResult[];
  hasFailure: boolean;
};
```

### テストケース

- 全アプリが成功した場合、全ての結果が「succeeded」でhasFailureがfalse
- 途中でアプリが失敗した場合、失敗以降のアプリは「skipped」でhasFailureがtrue
- 最初のアプリが失敗した場合、それ以降は全て「skipped」
- 空のExecutionPlanの場合、空の結果でhasFailureがfalse

---

## アーキテクチャノート

### ServiceArgsパターン不使用について

projectConfigドメインのユースケース（`loadProjectConfig`, `resolveExecutionPlan`）は、他ドメインで使用される `ServiceArgs<T>` パターン（`{ container, input }` 構造）を採用していない。これは意図的な設計判断である。

- projectConfigはアプリ固有のDIコンテナ（`container`）が存在する前に実行される初期化フェーズのユースケースである
- `loadProjectConfig` は純粋関数としてYAMLテキストを受け取りProjectConfigを返す
- `resolveExecutionPlan` もProjectConfigとCLI引数から実行計画を計算する純粋関数である
- これらのユースケースが外部サービスへの依存を持たないため、コンテナの注入が不要
