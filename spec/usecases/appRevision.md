# AppRevision ユースケース

## checkDeployState

### 概要

アプリの preview に、deploy したら公開される未デプロイの編集が残っていないかを判定する。kintone の deploy はアプリの preview の設定をまるごと公開するため、フォームに限らずアプリ全体で 1 つの revision を比べる。kintone にもローカルにも書き込まない。

### 入力DTO

なし

### 処理フロー

1. `AppRevisionGenerationsReader.read()` で preview と published の revision を読む
2. `DeployStateEvaluator.evaluate()` で `DeployState` を導いて返す

### 出力DTO

```typescript
type DeployState =
  | Readonly<{ kind: "upToDate"; revision: string }>
  | Readonly<{ kind: "pending"; previewRevision: string; publishedRevision: string }>
  | Readonly<{ kind: "neverDeployed"; previewRevision: string }>;
```

判定の定義は [AppRevision ドメイン](../domains/appRevision.md#deploystate) を参照。

### テストケース

#### 正常系

- preview と published の revision が一致すれば `upToDate`
- preview が進んでいれば両方の revision を持つ `pending`
- published が無ければ `neverDeployed`

#### 異常系

- preview の読み取りに失敗した場合（存在しないアプリなど）、published を読まずにエラーがスローされる
- published の読み取りが `GAIA_AP01` 以外（403 / 401 / 500 / 他の 404）で失敗した場合、`neverDeployed` にせずエラーがスローされる
- published の読み取りが `GAIA_AP01` を返し、続く preview の読み直しが失敗した場合、`neverDeployed` にせずエラーがスローされる
- 応答に revision が無い場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

### check-pending コマンド

`checkDeployState` ユースケースをCLIから実行する。

- `AppRevisionGenerationsReader` → `KintoneAppRevisionGenerationsReader`
- 対象アプリ → `--app-id` / `KINTONE_APP_ID`（legacy）、`--app <name>`、`--all`
- 判定中はスピナーを出し、成功でも失敗でも止める
- 表示と終了コード

| 判定 | 表示 | 終了コード |
| --- | --- | --- |
| `upToDate` | `No undeployed changes (preview and published are both at revision N).` | 0 |
| `pending` | `Undeployed changes are pending: preview is at revision P, published is at revision Q. A deploy would publish them.` と、deploy の処理中もこう表示されること | 1 |
| `neverDeployed` | `The app has never been deployed (preview revision P). A deploy would publish its entire configuration.` | 1 |
| エラー | 各エラー種別の表示 | 1 |

- `--all` は全アプリを依存順に判定し、`pending` / `neverDeployed` のアプリがあっても残りの判定を続ける。最後に該当アプリの一覧を出して終了コード 1、無ければ `No undeployed changes in any app.` を出して 0
- `--all` の読み取りエラーは Fail-Fast で停止する。それまでに見つけた該当アプリの一覧を出してからエラーを表示し、`No undeployed changes in any app.` は出さない
- プロジェクト設定ファイルがあり `--app` / `--all` / `--app-id` のいずれも無い場合は、アプリ一覧を表示し、どのアプリも判定していないことをエラーとして出して終了コード 1
