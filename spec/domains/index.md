# ドメイン一覧

## ドメイン一覧

| ドメイン | 概要 | 種別 | ユースケース | スコープ状態 |
| --- | --- | --- | --- | --- |
| [FormSchema](./formSchema.md) | kintoneフォーム設定の宣言的管理 | コアドメイン | [usecase](../usecases/formSchema.md) | apply / capture / diff 対応 |
| [ProjectConfig](./projectConfig.md) | 複数アプリのプロジェクト設定管理 | サポートドメイン | [usecase](../usecases/projectConfig.md) | 複数アプリ一括実行（orchestration）対応 |
| [SeedData](./seedData.md) | kintoneレコードデータのシード管理 | サポートドメイン | [usecase](../usecases/seedData.md) | apply（Upsert）/ capture 対応 |
| [Customization](./customization.md) | JS/CSSカスタマイズの宣言的管理 | サポートドメイン | [usecase](../usecases/customization.md) | apply / capture / diff 対応 |
| [FieldPermission](./fieldPermission.md) | フィールドアクセス権の宣言的管理 | サポートドメイン | [usecase](../usecases/fieldPermission.md) | apply / capture / diff 対応 |
| [View](./view.md) | 一覧（ビュー）設定の宣言的管理 | サポートドメイン | [usecase](../usecases/view.md) | apply / capture / diff 対応 |
| [AppPermission](./appPermission.md) | アプリのアクセス権の宣言的管理 | サポートドメイン | [usecase](../usecases/appPermission.md) | apply / capture / diff 対応 |
| [RecordPermission](./recordPermission.md) | レコードのアクセス権の宣言的管理 | サポートドメイン | [usecase](../usecases/recordPermission.md) | apply / capture / diff 対応 |
| [ProcessManagement](./processManagement.md) | プロセス管理（ワークフロー）の宣言的管理 | サポートドメイン | [usecase](../usecases/processManagement.md) | apply / capture / diff 対応 |
| [GeneralSettings](./generalSettings.md) | 一般設定の宣言的管理 | サポートドメイン | [usecase](../usecases/generalSettings.md) | apply / capture / diff 対応 |
| [Notification](./notification.md) | 通知設定の宣言的管理 | サポートドメイン | [usecase](../usecases/notification.md) | apply / capture / diff 対応 |
| [Report](./report.md) | グラフ・レポート設定の宣言的管理 | サポートドメイン | [usecase](../usecases/report.md) | apply / capture / diff 対応 |
| [Action](./action.md) | アクション設定の宣言的管理 | サポートドメイン | [usecase](../usecases/action.md) | apply / capture / diff 対応 |
| [AdminNotes](./adminNotes.md) | アプリ管理者用メモの宣言的管理 | サポートドメイン | [usecase](../usecases/adminNotes.md) | apply / capture / diff 対応 |
| [Plugin](./plugin.md) | プラグイン設定の宣言的管理 | サポートドメイン | [usecase](../usecases/plugin.md) | apply（追加・有効化のみ）/ capture / diff 対応。無効化・削除は kintone API 非対応 |

## ドメイン区分の方針

本システムは「kintoneアプリ設定を宣言的に管理する」CLIツールである。

各ドメインはkintone REST APIで取得・更新可能な設定単位に対応し、`capture`（現在設定の取得・YAML化）、`apply`（YAML設定の適用）、`diff`（ローカル設定とリモート設定の差分表示）の3操作を基本パターンとする。すべてのドメインが同一のヘキサゴナルアーキテクチャ（ドメイン層・アダプター層・アプリケーション層・CLI層）に従い、`field-acl` の実装をリファレンスとして統一的なパターンで実装されている。
