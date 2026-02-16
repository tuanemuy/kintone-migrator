# kintone-migrator 機能拡張プラン概要

## 現在実装済みの機能

| コマンドグループ | サブコマンド | 概要 |
|---|---|---|
| `schema` | `capture`, `migrate`, `diff`, `validate`, `override`, `dump` | フォームフィールド・レイアウトの宣言的管理 |
| `seed` | `capture`, `apply` | レコードデータの管理 |
| `customize` | `apply` | JS/CSSカスタマイズの適用 |
| `field-acl` | `capture`, `apply` | フィールドのアクセス権管理 |

## 新規追加候補の機能

kintone REST API で取得・更新の両方が提供されており、宣言的に管理できる設定は以下の通り。

| # | 機能 | 優先度 | 個別プラン |
|---|---|---|---|
| 1 | 一覧（ビュー）設定 | **高** | [01-views.md](./01-views.md) |
| 2 | アプリのアクセス権 | **高** | [02-app-acl.md](./02-app-acl.md) |
| 3 | レコードのアクセス権 | **高** | [03-record-acl.md](./03-record-acl.md) |
| 4 | プロセス管理（ワークフロー） | **高** | [04-process-management.md](./04-process-management.md) |
| 5 | 一般設定 | **中** | [05-general-settings.md](./05-general-settings.md) |
| 6 | 通知設定（条件通知・レコード条件通知・リマインダー） | **中** | [06-notifications.md](./06-notifications.md) |
| 7 | グラフ・レポート設定 | **中** | [07-reports.md](./07-reports.md) |
| 8 | アクション設定 | **低** | [08-actions.md](./08-actions.md) |
| 9 | アプリ管理者用メモ | **低** | [09-admin-notes.md](./09-admin-notes.md) |
| 10 | プラグイン設定 | **低** | [10-plugins.md](./10-plugins.md) |

## 対象外とした機能

| 機能 | 除外理由 |
|---|---|
| スペース管理 | アプリ単位の管理ツールのスコープ外。スペースは複数アプリを横断する概念 |
| レコードのCRUD操作（個別） | `seed` コマンドで既にカバー |
| カーソル操作 | 内部実装の詳細。宣言的管理の対象ではない |
| コメント操作 | 運用時のデータ |
| ステータス更新 / 担当者変更 | レコードの運用操作 |
| ファイルアップロード/ダウンロード | `customize` 内部で使用済み |
| API情報取得 | メタデータ取得のみ |

## 共通の実装パターン

各機能は `field-acl` の実装パターンを踏襲する。詳細は `CLAUDE.md` および `docs/backend_implementation_example.md` を参照。

### リファレンス実装: `field-acl`

```
src/core/domain/fieldPermission/
  entity.ts, valueObject.ts, errorCode.ts
  ports/fieldPermissionConfigurator.ts, ports/fieldPermissionStorage.ts
  services/configParser.ts, services/configSerializer.ts
  services/__tests__/configParser.test.ts, configSerializer.test.ts

src/core/adapters/kintone/fieldPermissionConfigurator.ts
src/core/adapters/local/fieldPermissionStorage.ts

src/core/application/container/fieldPermission.ts   # Container型定義
src/core/application/container/cli.ts               # DI Factory関数
src/core/application/fieldPermission/
  captureFieldPermission.ts, applyFieldPermission.ts,
  parseConfig.ts, saveFieldPermission.ts
  __tests__/*.test.ts

src/cli/commands/field-acl/
  index.ts, capture.ts, apply.ts
  __tests__/capture.test.ts, apply.test.ts
```

### 新規機能の作成手順

1. **ドメイン層**: entity.ts → valueObject.ts → errorCode.ts → ports/ → services/（parser, serializer）
2. **アダプター層**: kintoneアダプター（port実装）+ localストレージアダプター
3. **アプリケーション層**: container型定義 → cli.tsにfactory関数追加 → ユースケース関数
4. **CLI層**: commands/{domain}/index.ts + capture.ts + apply.ts
5. **テスト**: services/__tests__/, application/__tests__/, cli/__tests__/
6. **品質チェック**: `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test`
