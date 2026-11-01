# AppRevision

## ドメイン名

AppRevision

## 概要

kintone アプリの revision（アプリの設定のリビジョン番号）を扱う。revision はアプリ全体で 1 つの値で、フォーム・ビュー・権限・通知などすべての設定の取得 API が同じ値を返す。preview（動作テスト環境）の設定を変えると preview の revision だけが進み、deploy（または変更の中止）で published（運用環境）の revision が preview と同じ値になる。

このドメインは revision を 2 つの用途に使う。

- 3-way 差分のベース: pull / push のときに観測した preview の revision をローカルに保存し、次の実行で remote の preview の revision と比べる
- 未デプロイの編集の判定: preview と published の revision を比べ、deploy したら何かが公開されるかを判定する

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| アプリの revision | AppRevision | ローカルに保存した、最後に pull / push した時点の preview の revision |
| 公開済みの revision | PublishedAppRevision | published の revision。一度も deploy していないアプリには無い |
| 両世代の revision | AppRevisionGenerations | preview と published の revision の組 |
| デプロイ状態 | DeployState | deploy したら preview に溜まったものが公開されるかの判定 |

## 値オブジェクト

### AppRevision

```typescript
type AppRevision = Readonly<{ revision: string }>;
```

- `state/<appName>/revision.yaml` にアプリごとに 1 つ保存する。各ドメインのスナップショットには revision を持たせない

### PublishedAppRevision

```typescript
type PublishedAppRevision =
  | Readonly<{ kind: "deployed"; revision: string }>
  | Readonly<{ kind: "neverDeployed" }>;
```

### AppRevisionGenerations

```typescript
type AppRevisionGenerations = Readonly<{
  preview: string;
  published: PublishedAppRevision;
}>;
```

### DeployState

```typescript
type DeployState =
  | Readonly<{ kind: "upToDate"; revision: string }>
  | Readonly<{ kind: "pending"; previewRevision: string; publishedRevision: string }>
  | Readonly<{ kind: "neverDeployed"; previewRevision: string }>;
```

| kind | 条件 | 意味 |
| --- | --- | --- |
| `upToDate` | preview と published の revision が一致する | preview に未デプロイの編集は無い |
| `pending` | 一致しない | 未デプロイの編集がある。deploy の処理中も published の revision が古いままなのでこれになる |
| `neverDeployed` | published が無い | 一度も deploy していない。deploy で設定全体が公開される |

- revision で判定するため、編集して手で元に戻した場合（内容は同じだが revision は進む）も `pending` になる。公開される内容に差が無いことは判定しないが、安全側に倒れる
- 誰の編集かは区別しない

## ドメインサービス

### AppRevisionParser / AppRevisionSerializer

保存した `AppRevision` とプレーンオブジェクトを相互に変換する純粋関数。`revision` が空でない文字列でなければ `BusinessRuleError(AR_INVALID_STRUCTURE)` をスローする。

### DeployStateEvaluator

```typescript
const DeployStateEvaluator = {
  evaluate: (generations: AppRevisionGenerations): DeployState;
  hasUndeployedChanges: (state: DeployState): boolean;
};
```

- `evaluate()` は上の表のとおり `DeployState` を導く。revision は文字列として比べる
- `hasUndeployedChanges()` は `upToDate` 以外で `true` を返す

## ポート

### AppRevisionReader

```typescript
interface AppRevisionReader {
  getCurrent(): Promise<string>;
}
```

- remote の preview の revision を返す。3-way 差分のベースと比べる値で、published の revision はこの用途では意味を持たないため preview 固定

### AppRevisionStorage

```typescript
interface AppRevisionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
```

- ローカルに保存した `AppRevision` のテキストを読み書きする。初回は `exists: false`

### AppRevisionGenerationsReader

```typescript
interface AppRevisionGenerationsReader {
  read(): Promise<AppRevisionGenerations>;
}
```

- preview と published の revision を読む
- 一度も deploy していないアプリは `published.kind === "neverDeployed"` を返す。アプリを読めない場合（存在しない・権限が無いなど）はエラーで、`neverDeployed` にはしない
- kintone アダプターは両世代とも `getAppAcl` の `revision` を読む。両世代ともアプリ管理権限だけで読めるため（published の `getViews` / `getAppSettings` / `getFormLayout` などはアプリ管理権限だけの API トークンでは `GAIA_NO01` になる）
- kintone は一度も deploy していないアプリの published の読み取りに、存在しないアプリと同じ `404 GAIA_AP01` を返す。アダプターは preview を先に読み、published が `GAIA_AP01` のときは preview を読み直す。読み直しが成功すれば `neverDeployed`、失敗すればそのエラーにする（2 回の読み取りの間にアプリが削除された場合を `neverDeployed` にしない）

## CLI

| コマンド | 説明 |
| --- | --- |
| `check-pending` | アプリの preview に未デプロイの編集が残っていないかを判定する |

詳細は [AppRevision ユースケース](../usecases/appRevision.md) を参照。
