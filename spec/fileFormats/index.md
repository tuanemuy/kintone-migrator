# ファイルフォーマット仕様 共通テンプレート・規約

本ディレクトリ配下の各ファイルフォーマット仕様（`schema.md` / `seed.md` ほか）が従う共通のドキュメント構成と表記規約を定義する。新規にファイルフォーマット仕様を追加・更新する際は、本ドキュメントのテンプレートと規約に揃えること。

## 標準セクション構成

各ファイルフォーマット仕様は、以下のセクションをこの順序で備えることを標準とする。対象ドメインに該当しないセクションは省略してよいが、存在する場合は順序を揃える。

| セクション | 内容 |
| --- | --- |
| 概要 | 対象とする kintone 設定領域、ファイルが表す状態（全置換 / 部分更新 等）の要約 |
| kintone API リファレンス | 取得（get）・反映（add / update）に用いる kintone REST API へのリンク |
| フォーマット（YAML例） | 代表的な設定を網羅した YAML の記述例 |
| フィールド定義表 | 各プロパティの「プロパティ / 型 / 必須 / 説明」を表形式で定義（後述） |
| バリデーション | パース・適用時に実行される検証ルールと対応エラーコード |
| エラーコード | 対応する `src/core/domain/<domain>/errorCode.ts` のコード一覧 |
| ラウンドトリップ・反映方式 | capture / apply の往復整合性、全置換かマージか、revision（楽観ロック）の扱い |

詳細仕様の手本は [スキーマ仕様](./schema.md) を参照する。

## 必須/任意の統一表記

必須・任意の表記は **「必須」/「任意」の2値に統一する**。`Yes` / `No`、`必須` / `-`、`◯` / `✕` 等の表記は使用しない。

> 注: `schema.md` は歴史的経緯から一部の表で `Yes` / `No` を用いているが、新規・更新時は「必須」/「任意」に揃える。

## フィールド定義の形式

フィールド定義は **表形式**を標準とする。列は次の4列を基本とする。

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `propertyName` | 型名 | 必須 / 任意 | プロパティの説明 |

- 型名は PascalCase の型（例: `EntityRef`）または TypeScript リテラル（例: `"USER"` \| `"GROUP"`）で記す。
- **ネスト構造**は、(a) サブ表（`**ChildType**:` の見出しに続けて子プロパティの表を置く）、または (b) `親.子` 記法（例: `entity.type`、`periodicReport.period.every`）で表現する。箇条書きのみでの定義は避ける。

## 命名規則の対応表

ドメインモデル・設定ファイル・CLI で用いる識別子は、文脈ごとに以下の記法に従う。

| 文脈 | 記法 | 例 |
| --- | --- | --- |
| 型名（エンティティ・値オブジェクト） | PascalCase | `FormSchema`、`EntityRef`、`PeriodicReportPeriod` |
| フィールド / プロパティ名（YAML キー含む） | camelCase | `relatedApp`、`filterCond`、`includeSubs` |
| CLI コマンド / サブコマンド・ファイルパス | kebab-case | `field-acl`、`app-acl`、`admin-notes` |

- kintone API 由来の列挙値（`SINGLE_LINE_TEXT`、`PRIMARY` 等）は API の表記（UPPER_SNAKE_CASE）をそのまま用いる。
- YAML 例・フィールド定義表のプロパティ名は camelCase で統一する。

## ドメイン名 ↔ ファイル名 ↔ CLI コマンド名 対応表

ドメインモデルの名前と、ファイルフォーマット仕様のファイル名・CLI コマンド名は一部で異なる。対応は次のとおり。

| ドメイン名（PascalCase） | ファイル名 | CLI コマンド |
| --- | --- | --- |
| FormSchema | schema.md | `schema` |
| SeedData | seed.md | `seed` |
| Customization | customization.md | `customize` |
| ProjectConfig | projectConfig.md | （複数アプリ一括実行。専用サブコマンドは持たず各コマンドの実行コンテキストを構成する） |
| FieldPermission | fieldPermission.md | `field-acl` |
| View | view.md | `view` |
| AppPermission | appPermission.md | `app-acl` |
| RecordPermission | recordPermission.md | `record-acl` |
| ProcessManagement | processManagement.md | `process` |
| GeneralSettings | generalSettings.md | `settings` |
| Notification | notification.md | `notification` |
| Report | report.md | `report` |
| Action | action.md | `action` |
| AdminNotes | adminNotes.md | `admin-notes` |
| Plugin | plugin.md | `plugin` |

名前が一致しない経緯: FormSchema / SeedData はファイル名・CLI 名を短縮形（schema / seed）で表す。アクセス権系（FieldPermission / AppPermission / RecordPermission）の CLI 名は kintone の慣用語「ACL（アクセス制御リスト）」に準拠し `field-acl` / `app-acl` / `record-acl` とする。

## ファイルフォーマット仕様一覧

| ドキュメント | 概要 |
| --- | --- |
| [スキーマ仕様](./schema.md) | フォーム（フィールド・レイアウト・装飾要素）の仕様 |
| [プロジェクト設定仕様](./projectConfig.md) | 複数アプリ管理・依存関係の仕様 |
| [シードデータ仕様](./seed.md) | レコードデータ管理・Upsert の仕様 |
| [カスタマイズ設定仕様](./customization.md) | JS/CSS カスタマイズの仕様 |
| [フィールドアクセス権設定仕様](./fieldPermission.md) | フィールドアクセス権の仕様 |
| [ビュー設定仕様](./view.md) | 一覧（ビュー）設定の仕様 |
| [アプリアクセス権設定仕様](./appPermission.md) | アプリアクセス権の仕様 |
| [レコードアクセス権設定仕様](./recordPermission.md) | レコードアクセス権の仕様 |
| [プロセス管理設定仕様](./processManagement.md) | プロセス管理（ワークフロー）の仕様 |
| [一般設定仕様](./generalSettings.md) | アプリ一般設定の仕様 |
| [通知設定仕様](./notification.md) | 通知設定の仕様 |
| [レポート設定仕様](./report.md) | グラフ・レポート設定の仕様 |
| [アクション設定仕様](./action.md) | アクション設定の仕様 |
| [管理者用メモ設定仕様](./adminNotes.md) | アプリ管理者用メモの仕様 |
| [プラグイン設定仕様](./plugin.md) | プラグイン設定の仕様 |
