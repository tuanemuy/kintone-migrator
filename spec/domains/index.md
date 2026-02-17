# ドメイン一覧

## ドメイン一覧

| ドメイン | 概要 | 種別 |
| --- | --- | --- |
| [FormSchema](./formSchema.md) | kintoneフォーム設定の宣言的管理 | コアドメイン |
| [ProjectConfig](./projectConfig.md) | 複数アプリのプロジェクト設定管理 | サポートドメイン |
| [SeedData](./seedData.md) | kintoneレコードデータのシード管理 | サポートドメイン |
| [Customization](./customization.md) | JS/CSSカスタマイズの宣言的管理 | サポートドメイン |
| [FieldPermission](./fieldPermission.md) | フィールドアクセス権の宣言的管理 | サポートドメイン |
| [View](./view.md) | 一覧（ビュー）設定の宣言的管理 | サポートドメイン |
| [AppPermission](./appPermission.md) | アプリのアクセス権の宣言的管理 | サポートドメイン |
| [RecordPermission](./recordPermission.md) | レコードのアクセス権の宣言的管理 | サポートドメイン |
| [ProcessManagement](./processManagement.md) | プロセス管理（ワークフロー）の宣言的管理 | サポートドメイン |
| [GeneralSettings](./generalSettings.md) | 一般設定の宣言的管理 | サポートドメイン |
| [Notification](./notification.md) | 通知設定の宣言的管理 | サポートドメイン |
| [Report](./report.md) | グラフ・レポート設定の宣言的管理 | サポートドメイン |
| [Action](./action.md) | アクション設定の宣言的管理 | サポートドメイン |
| [AdminNotes](./adminNotes.md) | アプリ管理者用メモの宣言的管理 | サポートドメイン |
| [Plugin](./plugin.md) | プラグイン設定の宣言的管理 | サポートドメイン |

## ドメイン区分の方針

本システムは「kintoneアプリ設定を宣言的に管理する」CLIツールである。

各ドメインはkintone REST APIで取得・更新可能な設定単位に対応し、`capture`（現在設定の取得・YAML化）と `apply`（YAML設定の適用）の2操作を基本パターンとする。すべてのドメインが同一のヘキサゴナルアーキテクチャ（ドメイン層・アダプター層・アプリケーション層・CLI層）に従い、`field-acl` の実装をリファレンスとして統一的なパターンで実装されている。
