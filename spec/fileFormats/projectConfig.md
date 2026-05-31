# プロジェクト設定ファイル仕様

## kintone API リファレンス

- [アプリの情報を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/get-app/)
- [アプリの一覧を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/get-apps/)
- [スペースの情報を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/spaces/get-space/)

## 概要

`kintone-migrator.yaml`（デフォルトパス）で複数のkintoneアプリを一括管理するためのプロジェクト設定ファイル。

## フォーマット

```yaml
# 共通接続設定（アプリ単位で上書き可能）
domain: example.cybozu.com
auth:
  apiToken: "shared-token"
guestSpaceId: "456"  # optional

# アプリ定義
apps:
  customer:
    appId: "10"
    files:
      schema: schemas/customer.yaml  # 省略時: schemas/<appName>.yaml
  order:
    appId: "20"
    files:
      schema: schemas/order.yaml
    dependsOn:
      - customer
  invoice:
    appId: "30"
    dependsOn:
      - order
      - customer
```

## フィールド定義

### トップレベル

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `domain` | string | - | kintoneドメイン。CLI引数・環境変数・設定ファイルのいずれかで指定 |
| `auth` | object | - | 認証設定。CLI引数・環境変数・設定ファイルのいずれかで指定 |
| `auth.apiToken` | string | - | APIトークン認証。指定すると apiToken 型として解決される |
| `auth.username` | string | - | パスワード認証のユーザー名（`password` とセットで指定） |
| `auth.password` | string | - | パスワード認証のパスワード（`username` とセットで指定） |

`auth` には discriminator（`type`）を記述しない。`apiToken` の有無で認証方式を判別し、`apiToken` を最優先する。`apiToken` を指定した場合は `username`/`password` を併記していても無視され、apiToken 型として解決される（エラーにはならない）。`apiToken` を指定しない場合は `username` と `password` の両方が必須で、片方のみの指定はエラーとなる。`apiToken` が空文字、または `username`/`password` が空文字の場合もエラー（`PC_INVALID_AUTH_CONFIG`）となる。判別ルールの詳細は [projectConfig ドメイン仕様](../domains/projectConfig.md) の「auth の判別ロジック」を参照。
| `guestSpaceId` | string | - | ゲストスペースID |
| `apps` | object | 必須 | アプリ定義（空でないオブジェクト） |

### アプリ定義（`apps.<name>`）

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `appId` | string | 必須 | kintoneアプリID（非空文字列） |
| `files` | object | - | ファイルパスをまとめて指定するオブジェクト（下記参照） |
| `domain` | string | - | このアプリ固有のドメイン（トップレベルを上書き） |
| `auth` | object | - | このアプリ固有の認証設定（トップレベルを上書き） |
| `guestSpaceId` | string | - | このアプリ固有のゲストスペースID |
| `dependsOn` | string[] | - | 依存先アプリ名の配列 |

### ファイルパスオブジェクト（`apps.<name>.files`）

| フィールド | 説明 | デフォルト |
| --- | --- | --- |
| `files.schema` | スキーマファイルパス | `schemas/<appName>.yaml` |
| `files.seed` | シードデータファイルパス | `seeds/<appName>.yaml` |
| `files.customize` | カスタマイズファイルパス | `customize/<appName>.yaml` |
| `files.fieldAcl` | フィールドACLファイルパス | `field-acl/<appName>.yaml` |
| `files.view` | ビューファイルパス | `view/<appName>.yaml` |
| `files.appAcl` | アプリACLファイルパス | `app-acl/<appName>.yaml` |
| `files.recordAcl` | レコードACLファイルパス | `record-acl/<appName>.yaml` |
| `files.process` | プロセス管理ファイルパス | `process/<appName>.yaml` |
| `files.settings` | 一般設定ファイルパス | `settings/<appName>.yaml` |
| `files.notification` | 通知設定ファイルパス | `notification/<appName>.yaml` |
| `files.report` | レポートファイルパス | `report/<appName>.yaml` |
| `files.action` | アクションファイルパス | `action/<appName>.yaml` |
| `files.adminNotes` | 管理者メモファイルパス | `admin-notes/<appName>.yaml` |
| `files.plugin` | プラグインファイルパス | `plugin/<appName>.yaml` |

> **非推奨**: フラットフィールド形式（`schemaFile`, `seedFile` 等）は非推奨。`files` オブジェクトを使用すること。後方互換性のため引き続きサポートされるが、将来のバージョンで削除される可能性がある。両方指定した場合は `files` が優先される。

## バリデーションルール

- `apps` は必須で、空でないオブジェクトであること
- 各アプリに `appId`（非空文字列）が必須
- 全ファイルパスフィールドは省略時に規約ベースのデフォルト値が設定される（例: `schemas/<appName>.yaml`）
- `dependsOn` の参照先は同一設定ファイル内のアプリ名であること
- `domain` はCLI引数（`--domain`）、環境変数（`KINTONE_DOMAIN`）、または設定ファイル（トップレベル/アプリ単位）のいずれかで解決される
- `auth` はCLI引数（`--api-token`, `--username`/`--password`）、環境変数（`KINTONE_API_TOKEN`, `KINTONE_USERNAME`/`KINTONE_PASSWORD`）、または設定ファイル（トップレベル/アプリ単位）のいずれかで解決される
- 循環依存は `--all` による実行順序解決時に検出してエラー

## 設定マージ優先順位（高→低）

1. CLI引数（`--domain`, `--api-token` 等）
2. 環境変数（`KINTONE_DOMAIN`, `KINTONE_API_TOKEN` 等）
3. アプリ単位設定（各 `apps.<name>` 内）
4. 共通設定（トップレベル）

## CLI引数

| 引数 | 説明 |
| --- | --- |
| `--app <name>` | 対象アプリ名（設定ファイルから） |
| `--all` | 全アプリを依存順に実行 |
| `--config, -c` | 設定ファイルパス（デフォルト: `kintone-migrator.yaml`） |

### 排他ルール

- `--app` と `--all` は同時使用不可
- `--app-id` と `--app` は同時使用不可
- `--app-id` と `--all` は同時使用不可

## 依存関係解決

Kahn's algorithm（BFSトポロジカルソート）で実行順序を決定する。

- 同一レベルのアプリはアルファベット順（決定的な順序）
- 循環依存はサイクル参加ノードを列挙してエラー報告
- 存在しないアプリへの依存参照もエラー

## エラーコード

ドメインのバリデーション違反はドメイン層で `BusinessRuleError`（`PC_` プレフィックス付きコード）として throw され、アプリケーション層で `ValidationError` に変換される。コードの一覧は [projectConfig ドメイン仕様](../domains/projectConfig.md) の「エラーコード」を参照。

| シナリオ | エラー型 | コード |
| --- | --- | --- |
| 設定ファイルが見つからない（`--config`指定時） | ValidationError | INVALID_INPUT |
| 設定ファイルのYAML構文エラー | ValidationError | INVALID_INPUT |
| 設定ファイルの構造が不正（オブジェクトでない等） | BusinessRuleError | PC_INVALID_CONFIG_STRUCTURE |
| 循環依存 | BusinessRuleError | PC_CIRCULAR_DEPENDENCY |
| 存在しない依存先参照 | BusinessRuleError | PC_UNKNOWN_DEPENDENCY |
| `apps` が空 | BusinessRuleError | PC_EMPTY_APPS |
| `appId` が空 | BusinessRuleError | PC_EMPTY_APP_ID |
| アプリ名（マップのキー）が空 | BusinessRuleError | PC_EMPTY_APP_NAME |
| アプリ名に不正な文字が含まれる | BusinessRuleError | PC_INVALID_APP_NAME |
| `auth` が不正（apiToken が空文字、username/password の片方のみ・空文字） | BusinessRuleError | PC_INVALID_AUTH_CONFIG |
| `--app foo` で foo が設定に無い | NotFoundError | APP_NOT_FOUND |
| `domain` が未設定（実行時） | ValidationError | INVALID_INPUT |
| `auth` が未設定（実行時） | ValidationError | INVALID_INPUT |
