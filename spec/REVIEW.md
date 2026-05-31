# kintone設定管理CLIツール spec/ レビューレポート

## サマリー

本レビューは、複数レビュアーが検出し検証担当が「実在の問題」と確認した指摘を統合したものである。全体として、`spec/` ドキュメントは scenario・domains・fileFormats の各層が15ドメイン規模で整備されている一方、それらを繋ぐ usecase 層の欠落と、ドキュメント相互・ドキュメント↔実装間の不整合が際立つ。設計の方向性そのものに致命的な誤りは少なく、問題の大半は「ドキュメントの網羅性・整合性・トレーサビリティ」に集中している。ただし1件、capture/apply の往復契約を破壊する設計上の欠落（Plugin の `enabled:false` 実現手段の未定義）が Critical として残る。

重要度別の件数（検証後の調整済み severity ベース、全88件）:

| 重要度 | 件数 |
| --- | --- |
| Critical | 1 |
| High | 11 |
| Medium | 36 |
| Low | 40 |

カテゴリ別では completeness（網羅性欠落）と consistency（不整合）が支配的で、設計の「正しさ」より「文書としての完成度」に起因する指摘が中心である。

## Critical / High の指摘

### C1. Plugin の `enabled:false`（無効化/削除）を実現する手段が未定義で capture/apply の往復が成立しない

- **該当箇所**: `spec/domains/plugin.md:21-30,58-61`, `spec/fileFormats/plugin.md:5-8`
- **問題**: `PluginConfig` は `enabled: boolean` を持ちファイル例にも `enabled: false` があるが、参照する kintone API は `get-app-plugins`（取得）と `add-app-plugins`（追加）のみで、無効化・削除に対応するエンドポイントがない。`add-app-plugins` は追加専用のため、`enabled:false` を apply でどう実現するのかが宙に浮いており、capture で `enabled:false` を取り込んでも再現できず往復契約が破綻する。apply の反映方式（全置換/マージ）も未記述で、他ドメイン（adminNotes/customization/fieldPermission）が get+update 両APIと反映方式を明示しているのと対照的。
- **推奨対応**: 無効化/削除に対応する kintone API を `fileFormats/plugin.md` のリファレンスに追加する。add のみで無効化非対応なら、その制約と「apply は追加・有効化のみ、無効化はできない」旨を `domains/plugin.md` に明記し、`enabled:false` の扱い（無視/警告/エラー）を定義する。あわせて apply が全置換かマージか（ファイルに無いリモートプラグインを保持/削除するか）を1文で明記する。

### H1. usecase 層が10ドメイン分欠落し、scenario→domain→usecase→fileFormat のトレーサビリティが断絶（重複統合: 4件）

- **該当箇所**: `spec/usecases/`（view/appPermission/recordPermission/processManagement/generalSettings/notification/report/action/adminNotes/plugin が不在）, `spec/domains/index.md:12-21`, `spec/scenario/index.md:26-43`
- **問題**: domains/ と fileFormats/ は15ドメイン分揃い、scenario/index.md でも「アクセス権管理」「アプリ設定管理」として上記10ドメインの apply/capture が明確にシナリオ化されているのに、usecases/ には customization/fieldPermission/formSchema/projectConfig/seedData の5ファイルしか存在しない。capture/apply/diff の操作をどのアプリケーションサービスが担うか、エラーハンドリング・トランザクション境界・revision 授受がどこにも定義されておらず、設定領域ごとに操作フローが宙に浮いている。さらに scenario が描く「アプリ設定全体のIaC的管理」という価値と設計済み usecase の範囲に明確なカバレッジ乖離がある。appPermission・recordPermission については domain 仕様・実装・CLI まで揃っているのに usecase spec だけが欠落する非対称も確認されている。
- **推奨対応**: fieldPermission をリファレンスに、10ドメインの usecase 文書（applyXxx/captureXxx/saveXxx の処理フロー・入出力DTO・テストケース・CLI実行コンテキスト）を同一粒度で追加する。`field-acl` を参照とする統一パターンを採るなら「共通テンプレート＋ドメイン差分」として明記する。scenario 側にも「スコープ内/スコープ外（将来対応）」の線引きを記述し、scenario・domain・usecase の3層でカバレッジを一致させる。

### H2. capture/diff ユースケースが customization の spec に全く記載されていない（実装は存在）

- **該当箇所**: `spec/domains/customization.md`, `spec/usecases/customization.md`, 実装 `src/core/application/customization/{captureCustomization,detectCustomizationDiff,saveCustomization}.ts`
- **問題**: 実装には captureCustomization / detectCustomizationDiff / saveCustomization と CLI の capture/diff コマンドがあるが、spec は domains・usecases ともに applyCustomization のみ記載。formSchema 等の他ドメインは capture/diff を spec 化しているのに customization だけが欠落しており、ドメインモデルと実装の対応が大きく不完全。
- **推奨対応**: usecases/customization.md に captureCustomization（kintone取得→FILEダウンロード→ConfigSerializerでYAML化→保存）、detectCustomizationDiff、saveCustomization の概要・入出力DTO・処理フロー・テストケースを追記し、domains/customization.md のユースケース節にも対応記述を加える。

### H3. customization の FileDownloader / FileWriter / FileContentReader ポートが spec に欠落

- **該当箇所**: `spec/domains/customization.md`（ポート節）, 実装 `src/core/domain/customization/ports/{fileDownloader,fileWriter,fileContentReader}.ts`
- **問題**: spec のポート節は CustomizationConfigurator / FileUploader / CustomizationStorage の3つのみ。実装には capture/diff のファイル入出力に不可欠な FileDownloader（fileKeyから実体取得）、FileWriter（ローカル保存）、FileContentReader（diff時にローカル読込）の3ポートがあるが spec 未定義で、ポートの妥当性を評価できる状態にない。
- **推奨対応**: 3ポートを spec のポート節に追加し、各メソッドのシグネチャと例外（API/IO失敗時の SystemError）を明記。FileDownloader/FileContentReader を capture/diff フローと結びつけて記述する。

### H4. SUBTABLE 内フィールドの型に `LayoutElement` を使い、配置不可フィールドを型レベルで許容している

- **該当箇所**: `spec/domains/formSchema.md`（SubtableLayoutItem.fields, L520-526）, `spec/fileFormats/schema.md`（SUBTABLE, L99-103）
- **問題**: `SubtableLayoutItem.fields` が `readonly LayoutElement[]`（= LayoutField | DecorationElement | SystemFieldLayout）で、装飾要素（HR/SPACER/LABEL）やシステムフィールド（CATEGORY/STATUS）まで型上は配置可能。kintone のサブテーブル内には限られた入力フィールドしか置けず、ネストSUBTABLE/GROUP/REFERENCE_TABLE 等も不可。現状の型では不正スキーマがパース・生成段階を通過し、API適用時に初めて失敗する。型安全最優先という本プロジェクト方針とも整合しない。
- **推奨対応**: サブテーブル内配置可能フィールドのみを許す専用型（例: `SubtableInnerField`）を定義し、SUBTABLE/GROUP/REFERENCE_TABLE/システムフィールド/装飾要素を型レベルで排除する。fileFormat にも配置不可フィールドの一覧を明記する。

### H5. FormSchema のシナリオが宣言的設定の保存先を「管理者用メモ」と誤記し、AdminNotes ドメインと語が衝突（重複統合: 2件）

- **該当箇所**: `spec/scenario/index.md:5,7,8`, `spec/scenario/details.md`（シナリオ1/2/3/4 の多数行）
- **問題**: FormSchema 管理シナリオの宣言的設定の対象/保存先が一貫して「管理者用メモ」と書かれているが、対応する usecases/formSchema.md は SchemaStorage/SchemaParser とスキーマファイル(YAML)を扱う設計。さらに `AdminNotes` は kintone の「アプリ管理者用メモ」機能そのものを扱う独立ドメインとして実在し、scenario/index.md:40-41 でも別シナリオとして正しく記述されている。テンプレート流用時の置換ミスと見られ、読者が FormSchema 管理機能を AdminNotes 機能と混同しうる。
- **推奨対応**: scenario の FormSchema シナリオの「管理者用メモ」を「スキーマ（スキーマファイル/宣言的設定）」へ修正し usecases/formSchema.md の用語に揃える。AdminNotes ドメイン側にも「本ドメインは kintone のアプリ管理者用メモ機能を対象とし、FormSchema シナリオの用法とは別概念」である旨を注記する。

### H6. index.md の大多数のシナリオが details.md で詳細化されていない

- **該当箇所**: `spec/scenario/index.md`（11-43行）, `spec/scenario/details.md` 全体
- **問題**: index.md には30件超のシナリオがあるが、details.md でフロー・UI仕様・エラーハンドリングが書かれているのはフォームスキーマ管理（シナリオ1〜3a）とマルチアプリ（シナリオ5）のみ。シードUpsert/キャプチャ、JS/CSSカスタマイズ、各種ACL、ビュー、プロセス管理、一般設定、通知、グラフ、アクション、管理者用メモ、プラグインの apply/capture が詳細欠落しており、「各シナリオにフロー・UI仕様・エラーハンドリングが揃っているか」を満たさない。
- **推奨対応**: 各カテゴリの代表シナリオ（apply系1つ・capture系1つ）について、フロー・入出力・確認プロンプト/ダイアログ・冪等性・エラーハンドリングを追記する。apply/capture が共通パターンなら「共通シナリオテンプレート」を定義し、各設定種別の差分（対象API・前提・破壊性）のみを表で列挙して網羅性を担保する。

### H7. JSONフォーマットの扱いが schema.md と SchemaParser で矛盾

- **該当箇所**: `spec/fileFormats/schema.md`（616-647行「JSONフォーマット（参考）」）, `spec/domains/formSchema.md`（591行 SchemaParser）
- **問題**: schema.md は JSON フォーマット（ルートキー `fields`、プロパティを `properties` でラップ）を「YAMLの代替として使用可能」と現役サポート扱いで記載。一方 formSchema.md の SchemaParser は「旧フォーマット（`fields` キーのみ）検出時はエラーで新フォーマットへの移行を案内」とし `fields` キー形式を廃止扱いにしている。両者が真っ向から矛盾し、実装者が `fields` キー形式を受理すべきか拒否すべきか判断できない。
- **推奨対応**: JSON をサポート継続するなら SchemaParser の旧フォーマット案内を修正し、`fields` キー形式が JSON と新YAML layout でどう区別されるか（例: 配列でない `fields` はJSON）を明記する。サポートしないなら schema.md の JSON フォーマット節を削除または「非推奨・読み取り専用」に正す。

### H8. forceOverrideForm の updateLayout 実行がドメインとユースケースで不一致

- **該当箇所**: `spec/domains/formSchema.md`（719-737行 forceOverrideForm）, `spec/usecases/formSchema.md`（129-169行 forceOverrideForm）
- **問題**: domain 側の処理フローは追加・上書き・削除のみで updateLayout への言及が一切ない。一方 usecase 側は「フィールド操作後、常にレイアウトを更新する」とし、処理フローで `FormConfigurator.updateLayout()` を常に実行、テストケースにも含む。強制上書き時にレイアウトを更新するか否かという重要な振る舞いが食い違い、実装漏れにつながる。
- **推奨対応**: domain 側 forceOverrideForm の処理フローに updateLayout（常に実行）を追加し、操作順序・部分失敗時方針もレイアウト更新を含めて usecase 側と一致させる。

### H9. AppEntry の構造がドメイン spec とファイルフォーマット spec で不一致

- **該当箇所**: `spec/domains/projectConfig.md`（AppEntry, 38-49行）, `spec/fileFormats/projectConfig.md`（files オブジェクト, 66-85行）
- **問題**: domain spec の AppEntry は `schemaFile`/`seedFile` のフラット2フィールドのみ。一方 fileFormat spec は14種のファイルパスを持つ `files` オブジェクトを正とし、フラット形式を「非推奨」と明記している。つまりドメインモデルが本来正本であるべきなのに、非推奨であるはずのフラット構造のみを定義し、14種中12種が欠落。「ドメインモデルが正本」という本プロジェクトの中核原則に反し、複数サブコマンドの集約構造の理解を誤らせる。
- **推奨対応**: domain spec の AppEntry を実態（14種のファイルパスを保持する構造、例: `files: AppFilePaths`）に更新し、フラット構造は非推奨である旨を domain 側にも明記して fileFormat spec と一致させる。

### H10. AuthConfig の型表現がドメイン spec（Discriminated Union）と fileFormat（type フィールド無し）で食い違う

- **該当箇所**: `spec/domains/projectConfig.md`（AuthConfig, 78-89行）, `spec/fileFormats/projectConfig.md`（auth, 15-20/48-51行）
- **問題**: domain spec の AuthConfig は `type: "apiToken"` / `type: "password"` の Discriminated Union だが、fileFormat の auth は discriminator `type` を持たず apiToken/username/password を直接記述する。ファイル上に discriminator がないため ConfigParser が apiToken の有無で type を導出する必要があるが、その導出ルールと「apiToken と username/password を同時指定/不完全指定した場合の扱い」が ConfigParser バリデーション節に記述されていない。認証は接続の根幹であり、判別ルールと矛盾時のエラー仕様の未定義は実装間の挙動ブレや silent fallback を招く。
- **推奨対応**: ConfigParser バリデーション節に auth の判別ロジック（apiToken があれば apiToken型、なく username+password があれば password型、両方/不完全はエラー）を明記し、ファイル形式→Discriminated Union への変換規則とエラーコードを定義する。

### H11. RecordManager ポート型がドメイン spec と実装で乖離（Kintone型 vs ドメイン値オブジェクト）

- **該当箇所**: `spec/domains/seedData.md`（RecordManager）, 実装 `src/core/domain/seedData/ports/recordManager.ts`
- **問題**: domain spec の RecordManager は `getAllRecords→KintoneRecordForResponse[]`、`addRecords(KintoneRecordForParameter[])` 等と Kintone 型を露出し、usecase フローも「getAllRecords 後に RecordConverter.fromKintoneRecord でフラット変換」と記述。一方実装は `SeedRecordWithId`/`SeedRecord` のみを公開し、フラット変換は RecordConverter としてアダプター内で完結している。ポートの責務境界（Kintone型を露出するか否か）が spec と実装で根本的に食い違う。
- **推奨対応**: domain spec の RecordManager シグネチャを SeedRecord/SeedRecordWithId ベースに修正し、RecordConverter はアダプター層内で完結しポート境界ではドメイン型のみを扱う旨を明記。usecase フローの「アプリ層で変換」という表現も実態に合わせて訂正する。

## Medium / Low の指摘

### Medium

トレーサビリティ・カバレッジ

- 省略が意図的か設計漏れかを判別する記述が spec にない（domains/index.md にスコープ状態のマトリクス追加が望ましい）。
- 設定領域の依存・適用順序（フィールド定義→権限/プロセス/ビュー）を統括する orchestration usecase が未定義。
- `spec/index.md` / `domains/index.md` が usecases/ を一切参照せず、5つの usecase 文書が目次から孤立（重複統合: 「index にユースケース章なし」「index/domains が usecases 未参照」）。
- 15ドメインに対し usecase 文書が5本のみ、かつ各 domain 文書のCLI表が apply/capture のみで diff コマンドが欠落（実装には diff が存在）。

scenario 品質

- UIシナリオとCLIシナリオの方式が混在し、提供チャネル（UI/CLI/両方）の線引きが曖昧。
- UI系の破壊的操作・確認フロー・冪等性の記述不足（冪等性は spec 全体で記述ゼロ。ロールバック方針は domains/formSchema.md にあるがシナリオ未展開）。
- 異常系の網羅が不均一で、認証/権限/競合/デプロイ未完了が UI系で扱われていない（CLAUDE.md 定義の6エラー種別を基準にチェックリスト化すべき）。
- capture/dump 系シナリオの上書き挙動・`--force`・冪等性が未定義（fieldPermission には上書き警告があるが横断的に不統一）。

fileFormat 整合性

- ドキュメント構造が「詳細仕様3ファイル（schema/projectConfig/seed）」と「簡易仕様12ファイル」に分裂（フィールド定義表・バリデーション・エラーコード欠落）。
- 必須/任意の表記が Yes/No・必須/-・必須/任意 と3通り混在、簡易仕様は表すら持たない。
- フィールド定義のドキュメント形式（表 vs 箇条書き）が不統一で、generalSettings/view/notification/report のネスト構造が説明されていない。
- バリデーション・エラーコードの記述が12フォーマットに欠落。
- USER_SELECT系フィールド型の表記が schema.md（ORGANIZATION_SELECT）と seed.md（ORG_SELECT）で食い違い（正準は ORGANIZATION_SELECT）。

kintone 忠実性

- ProcessManagement 等7ドメインの Configurator に revision（楽観ロック）の扱いが未記述（FieldPermission/Customization のみ明示）。
- AppPermission の entity 種別に EVERYONE（GROUP/everyone）の扱いが未記載。
- AppPermissionEntity の code が必須だが CREATOR は code を持たない（型/フォーマットの整合欠如）。
- AppPermission の rights 配列順序の意味・全置換・revision 競合制御が未記載。
- AppPermissionConfigurator/Storage（および RecordPermission）のポートがメソッドシグネチャ未定義。
- Plugin の apply セマンティクス（追加/有効化/無効化、全置換か差分か）が曖昧。

ドメイン⇔実装整合性

- ConfigSerializer / DiffDetector ドメインサービス（customization）が spec に欠落。
- RemoteCustomization / CustomizationDiff 等の capture/diff用型が spec の値オブジェクト節に欠落（spec は CustomizationDiffResult という存在しない型名も参照）。
- capture 時の FILE リソース保存パス・ファイル名衝突解決（サニタイズ/連番）が spec 未記載。
- ConfigParser の入力契約が CLAUDE.md規約・実装と不整合（rawText 受取と記載、実装は pre-parsed unknown）。同種の陳腐化が formSchema/fieldPermission にも波及。
- spec のエラーコード表記が実装の errorCode.ts と不一致（CZ_ プレフィックスの有無等）。
- fileFormats/customization.md に capture 出力フォーマットとラウンドトリップ整合の記述がない。
- FieldPermission の FIELD_ENTITY と includeSubs の例・説明が fileFormat に欠落（recordPermission と非対称）。
- FieldPermission の diff 検出サービスがドメイン spec に未記載（実装には存在）。
- View ドメインの ConfigParser/ConfigSerializer 記述、ポート interface 定義、device デフォルト/type別必須ルールが欠落。
- index 系の「capture/apply の2操作が基本」記述が diff 常設の実装と乖離（field-acl 自身が3操作）。
- ProcessManagement の states キーと actions の from/to の参照整合性、ポート interface、ProcessEntity の type別 code/includeSubs 要否が未定義。
- GeneralSettings の Configurator/Storage ポート interface 欠落、ネスト値オブジェクトの部分更新セマンティクス曖昧。
- notification の daysLater サンプル（-1）と実装の非負整数検証の矛盾、Target型未定義、diff コマンドのCLI表欠落。
- Report の Record キーと name の制約未定義、index の意味未定義、PeriodicReportPeriod の every別必須未定義。
- Action の destApp.app（環境固有ID）の解決規則未定義、name とマップキーの二重表現、apply の更新戦略未定義。
- AdminNotes の diff 操作・値オブジェクトがドメイン spec に未記載。
- seedData の captureSeed の keyField 必須/任意の不一致、除外システムフィールド一覧の不一致（$id/$revision）。
- projectConfig のエラーコード表が実装 errorCode.ts と不一致（4コード欠落）、AppName検証ルール欠落、fileFormat のエラー型不統一。

### Low

命名・用語

- FormSchema/SeedData のドメイン名と fileFormat ファイル名が不一致（schema.md/seed.md）。
- PascalCase/camelCase/kebab-case の対応規則が未明文化。
- ドメイン名（Permission）と CLI名（acl）の不一致、「アクセス権」と「権限」の表記揺れ。
- FieldPermission の用語名 EntityType と実装型名 FieldPermissionEntityType の不一致。
- AppRight をエンティティに分類しているが実質は値オブジェクト（分類基準が曖昧）。
- PluginConfig/PluginsConfig の命名が紛らわしい（s 1文字差、設定値と誤認）。
- UpsertResult 見出しと実体 UpsertSeedOutput の名称不一致。

記述の薄さ・明確性

- 「概要」セクションの有無が不統一。
- バージョン/メタ情報フィールドがどのフォーマットにもない（前方互換性の論点）。
- エンティティ参照（entity）の表現構造（ラッパー有無/フラット）がフォーマット間で揺れる。
- index/order 値が文字列統一されている根拠（数値→文字列自動変換）が簡易仕様側に未記載。
- 各種ドメインの中核型のエンティティ/値オブジェクト分類スタイルが不揃い。
- 操作実行の前提条件（認証・権限・対象アプリ特定）がシナリオに未記載。
- 画面構成図にリセット操作（シナリオ3a）が含まれず、UI非対応の旨が未明記。
- diff の FILE 内容比較・details整形・各種マッチング方針が usecase に未記載（customization/notification/recordPermission ほか）。
- revision/diff 関連用語がユビキタス言語表に未掲載（view ほか）。
- 各ドメイン固有の値域・条件付き必須・特殊値の説明不足（ProcessState/ProcessAction、ReportAggregation の code、generalSettings の titleField/numberPrecision/icon FILE、ActionMapping の srcField、notification の entity.code、seed の FILE/SubtableRow 等）。
- システムフィールド CATEGORY/STATUS のアプリ設定依存とラウンドトリップ差分、relatedApp/destApp の環境依存注意書きの横断的不統一。
- spec が参照する型（SeedRecordWithId 等）が spec 内で未定義、saveSeed/saveSchema 等のエラー記述・入出力型の粒度不揃い。
- projectConfig の dependsOn の必須/任意・型の不整合、guestSpaceId/domain のマージ仕様欠落、executeMultiApp のアーキテクチャノート漏れ。

## 横断的な傾向

個別指摘を俯瞰すると、以下の構造的パターンが浮かび上がる。

1. **usecase 層が体系の「抜け穴」になっている**。scenario・domains・fileFormats は15ドメイン規模で整備されているのに、それらを繋ぐ usecase だけが5ドメインに留まり、index からも参照されず孤立している。トレーサビリティの断絶、orchestration の不在、appPermission/recordPermission/notification 等の操作フロー欠落は、すべてこの単一の構造的欠陥に起因する。

2. **「リファレンス実装1つ＋テンプレート横展開」方式の副作用**。field-acl/fieldPermission をリファレンスに統一パターンで実装する方針自体は妥当だが、(a) テンプレート流用時の置換ミス（FormSchema シナリオの「管理者用メモ」誤記）、(b) 横展開の不徹底（diff コマンドのCLI表欠落、ConfigSerializer/DiffDetector/各ポートの未記載）、(c) リファレンス自身の陳腐化（ConfigParser の rawText 記述が CLAUDE.md規約に反したまま全ドメインに波及）という3種の劣化を生んでいる。

3. **spec ↔ 実装の系統的乖離**。エラーコード（CZ_/PC_ プレフィックス、欠落コード）、ポートシグネチャ（Kintone型 vs ドメイン型）、ConfigParser の入力契約、AppEntry 構造、diff コマンドの有無など、ドキュメントが実装に追従できていない箇所が多数。「ドメインモデルが正本」という原則が宣言されている一方、実態は実装が先行し spec が取り残されている。

4. **ドキュメント粒度の二層化**。schema/projectConfig/seed の3ファイルは詳細仕様（フィールド表・バリデーション・エラーコード）を備えるが、残り12ファイルは簡易仕様（YAML例＋箇条書き）に留まる。必須/任意表記の3様式混在、概要節の有無もこの二層化の表れで、読者がファイルごとに期待できる情報量を予測できない。

5. **kintone 固有の環境依存・型制約の取りこぼし**。appId（relatedApp/destApp）の環境間移行、CREATOR/EVERYONE 等の特殊エンティティ、revision 楽観ロック、SUBTABLE 内配置制約、システムフィールドのアプリ設定依存など、kintone のドメイン知識を要する制約が型レベル・注意書きレベルで散発的に欠落している。

6. **冪等性・破壊的操作・反映方式の記述が体系的に不足**。冪等性は spec 全体で言及ゼロ、capture の上書き保護、apply の全置換/マージ、配列順序の意味（rights/notifications/reports）などが横断的に未定義で、特に Plugin では往復契約そのものを破壊するレベルに達している。

## 推奨アクション

優先順位付きで次の一手を示す。

1. **【最優先・Critical】Plugin の apply セマンティクスを確定する**（C1）。`enabled:false` を実現する API の有無を確認し、対応 API を fileFormat に追記するか、非対応なら制約と `enabled:false` の扱い（無視/警告/エラー）・全置換/マージ方針を domains に明記する。capture/apply の往復契約に直結するため最初に解消する。

2. **【高優先】共通テンプレートを用いて usecase 層を一括整備する**（H1, H2, H6, および多数の Medium）。fieldPermission を雛形に「共通テンプレート＋ドメイン差分表」を定義し、欠落10ドメインの usecase 文書と customization の capture/diff を埋める。同時に `spec/index.md` に「ユースケース仕様」章を新設し、scenario→domain→usecase→fileFormat の相互リンクでトレーサビリティを回復する。1つの構造的施策で最多の指摘を解消できる。

3. **【高優先】型安全に関わる設計欠陥を修正する**（H4, H10）。SUBTABLE 内フィールドの専用型導入と、AuthConfig の discriminator 導出規則・矛盾時エラー仕様の定義。型安全最優先という方針に直結し、不正設定の早期検出・認証の確実性に関わる。

4. **【高優先】spec を正本に同期させる「真実の単一源」整備**（H3, H7, H8, H9, H11, および spec↔実装乖離の Medium 群）。matching するエラーコード一覧・ポートシグネチャ・AppEntry 構造・JSON/旧フォーマットの扱いを実装と突き合わせて1箇所に正本化する。spec-sync 的な照合作業を一度通すことを推奨。

5. **【中優先】scenario 品質と横断ルールの底上げ**（H5, scenario 系 Medium/Low）。FormSchema シナリオの「管理者用メモ」誤記の修正、UI/CLI チャネルの明示、6エラー種別を基準にした異常系チェックリスト化、冪等性・破壊的操作・反映方式の統一フォーマット記述。

6. **【中〜低優先】fileFormat 共通テンプレートと命名規則の明文化**（fileFormat 整合性 Medium/Low、命名 Low 群）。全フォーマット共通のドキュメントテンプレート（概要/APIリファレンス/フォーマット/フィールド定義表/バリデーション/エラーコード）と、必須/任意表記・PascalCase/camelCase/kebab-case 対応表・entity 参照型を `domains/index.md` 等に1箇所定義する。簡易仕様12ファイルを段階的にテンプレートへ寄せる。

7. **【低優先・継続】kintone 固有制約の注記とドメイン辞書の整備**（kintone忠実性 Low、明確性 Low 群）。appId 環境依存・CREATOR/EVERYONE・revision・条件付き必須・特殊値などを、各ドメインの注意書きとユビキタス言語表に順次補完する。優先度は低いが保守負債として蓄積するため、上記4〜6の作業に併せて対応するのが効率的。