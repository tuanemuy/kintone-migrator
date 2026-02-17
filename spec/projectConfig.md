# プロジェクト設定ファイル仕様

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
    schemaFile: schemas/customer.yaml  # 省略時: schemas/<appName>.yaml
  order:
    appId: "20"
    schemaFile: schemas/order.yaml
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
| `auth.apiToken` | string | - | APIトークン認証 |
| `auth.username` | string | - | パスワード認証のユーザー名 |
| `auth.password` | string | - | パスワード認証のパスワード |
| `guestSpaceId` | string | - | ゲストスペースID |
| `apps` | object | 必須 | アプリ定義（空でないオブジェクト） |

### アプリ定義（`apps.<name>`）

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `appId` | string | 必須 | kintoneアプリID（非空文字列） |
| `schemaFile` | string | - | スキーマファイルパス。省略時: `schemas/<appName>.yaml` |
| `domain` | string | - | このアプリ固有のドメイン（トップレベルを上書き） |
| `auth` | object | - | このアプリ固有の認証設定（トップレベルを上書き） |
| `guestSpaceId` | string | - | このアプリ固有のゲストスペースID |
| `dependsOn` | string[] | - | 依存先アプリ名の配列 |
| `seedFile` | string | - | シードデータファイルパス。省略時: `seeds/<appName>.yaml` |
| `customizeFile` | string | - | カスタマイズファイルパス。省略時: `customize/<appName>.yaml` |
| `fieldAclFile` | string | - | フィールドACLファイルパス。省略時: `field-acl/<appName>.yaml` |
| `viewFile` | string | - | ビューファイルパス。省略時: `view/<appName>.yaml` |
| `appAclFile` | string | - | アプリACLファイルパス。省略時: `app-acl/<appName>.yaml` |
| `recordAclFile` | string | - | レコードACLファイルパス。省略時: `record-acl/<appName>.yaml` |
| `processFile` | string | - | プロセス管理ファイルパス。省略時: `process/<appName>.yaml` |
| `settingsFile` | string | - | 一般設定ファイルパス。省略時: `settings/<appName>.yaml` |
| `notificationFile` | string | - | 通知設定ファイルパス。省略時: `notification/<appName>.yaml` |
| `reportFile` | string | - | レポートファイルパス。省略時: `report/<appName>.yaml` |
| `actionFile` | string | - | アクションファイルパス。省略時: `action/<appName>.yaml` |
| `adminNotesFile` | string | - | 管理者メモファイルパス。省略時: `admin-notes/<appName>.yaml` |
| `pluginFile` | string | - | プラグインファイルパス。省略時: `plugin/<appName>.yaml` |
| `files` | object | - | ファイルパスをまとめて指定するオブジェクト（下記参照） |

### ファイルパスオブジェクト（`apps.<name>.files`）

フラットフィールド（`schemaFile` 等）の代わりに、`files` オブジェクトでファイルパスをまとめて指定できる。

| フィールド | 対応するフラットフィールド |
| --- | --- |
| `files.schema` | `schemaFile` |
| `files.seed` | `seedFile` |
| `files.customize` | `customizeFile` |
| `files.fieldAcl` | `fieldAclFile` |
| `files.view` | `viewFile` |
| `files.appAcl` | `appAclFile` |
| `files.recordAcl` | `recordAclFile` |
| `files.process` | `processFile` |
| `files.settings` | `settingsFile` |
| `files.notification` | `notificationFile` |
| `files.report` | `reportFile` |
| `files.action` | `actionFile` |
| `files.adminNotes` | `adminNotesFile` |
| `files.plugin` | `pluginFile` |

**優先順位**: `files.*` > フラットフィールド（`*File`）。両方指定した場合は `files` が優先される。

## バリデーションルール

- `apps` は必須で、空でないオブジェクトであること
- 各アプリに `appId`（非空文字列）が必須
- `schemaFile` 省略時は `schemas/<appName>.yaml` がデフォルト値
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

| シナリオ | エラー型 | コード |
| --- | --- | --- |
| 設定ファイルが見つからない（`--config`指定時） | ValidationError | INVALID_INPUT |
| 設定ファイルのYAML構文エラー | ValidationError | INVALID_INPUT |
| 設定ファイルのスキーマバリデーション失敗 | BusinessRuleError | 各エラーコード |
| `--app foo` で foo が設定に無い | NotFoundError | APP_NOT_FOUND |
| 循環依存 | BusinessRuleError | CIRCULAR_DEPENDENCY |
| 存在しない依存先参照 | BusinessRuleError | UNKNOWN_DEPENDENCY |
| `apps` が空 | BusinessRuleError | EMPTY_APPS |
| `appId` が空 | BusinessRuleError | EMPTY_APP_ID |
| `domain` が未設定（実行時） | ValidationError | INVALID_INPUT |
| `auth` が未設定（実行時） | ValidationError | INVALID_INPUT |
