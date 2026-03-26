# 実装計画 — Issue #128: initのスペース未指定対応

**Issue:** #128
**作成日:** 2026-03-26

---

## 目的

`init` コマンドでスペースの指定が必須となっているが、スペースに属さないアプリも存在する。`--space-id` を任意パラメータに変更し、未指定時は kintone REST API の `GET /k/v1/apps.json` を使ってすべてのアプリを対象にする。

## スコープ

### 含まれるもの
- `--space-id` パラメータのオプショナル化
- スペース未指定時の全アプリ取得ロジック追加（新ポート・アダプタ・ユースケース）
- CLI の分岐処理と表示メッセージの調整
- テストの追加・更新

### 含まれないもの
- `SpaceApp` 型の `AppInfo` 等へのリネーム（影響範囲が大きく、別Issue）
- 認証方式に関する変更
- パフォーマンス最適化（並列取得等）

## 実装ステップ

### 1. 新しいポートインターフェース `AppLister` を定義

- **対象ファイル:** `src/core/domain/app/ports/appLister.ts`（新規、`app` ドメインディレクトリも新規作成）
- **変更内容:** 全アプリ一覧取得用のポートインターフェースを定義。既存の `SpaceApp` 型を再利用する。
  ```typescript
  import type { SpaceApp } from "../../space/entity";
  export interface AppLister {
    getAllApps(): Promise<readonly SpaceApp[]>;
  }
  ```
- **理由:** スペースに属さないアプリの取得は `SpaceReader` の責務ではない。`space` ドメインではなく新しい `app` ドメインに配置することで、意味的な矛盾を避ける。`SpaceApp` 型はクロスドメインでインポートする。将来の `SpaceApp` リネーム Issue 時に `app` ドメイン内に型を移動する布石にもなる。

### 2. `KintoneAppLister` アダプタを実装

- **対象ファイル:** `src/core/adapters/kintone/appLister.ts`（新規）
- **変更内容:** `@kintone/rest-api-client` の `client.app.getApps()` を使い、offset/limit ベースのページネーション（100件ずつ）で全アプリを取得し、`SpaceApp[]` にマッピングして返す。エラーは既存の `wrapKintoneError` でラップする。
  - ページネーション: `client.app.getApps({ limit: 100, offset })` を呼び、返却された `apps.length < 100` のときループを終了する。
  - マッピング: SDK の `App` 型から `{ appId: app.appId, code: app.code, name: app.name }` として `SpaceApp` に変換。
- **理由:** kintone API は1回100件上限のため、ループで全件取得が必要。既存アダプタ（`KintoneSpaceReader`）と同じパターンに従う。

### 3. `fetchAllApps` ユースケースを追加

- **対象ファイル:** `src/core/application/init/fetchAllApps.ts`（新規）
- **変更内容:** `AppLister` ポートを使って全アプリを取得し、0件の場合は `NotFoundError` をスローするユースケース関数。`fetchSpaceApps` と同じパターン（`{ container }` 形式、input なし）に従う。0件時のエラーメッセージは `"No apps found. Please check your API token permissions."` とし、API トークン認証時のトラブルシュートを促す。
- **理由:** `fetchSpaceApps` は `SpaceReader` に依存しており、使うポートが異なる。既存コードを変更せず新しいユースケースとして分離する方がシンプル。

### 4. `InitContainer` 型に `appLister` を追加

- **対象ファイル:** `src/core/application/container/init.ts`
- **変更内容:** `InitContainer` に `appLister: AppLister` を必須プロパティとして追加。
- **理由:** コンテナは DI の器であり、使うかどうかはユースケース/CLI が決める。両方必須にすることで条件付き型の複雑さを避ける。`KintoneAppLister` のコンストラクタは軽量（API呼び出しなし、client の参照を保持するだけ）なので、`spaceId` 指定時に不要なインスタンスが生成されても実害はない。

### 5. `createInitCliContainer` に `KintoneAppLister` を追加

- **対象ファイル:** `src/core/application/container/initCli.ts`
- **変更内容:** `KintoneAppLister` インスタンスを生成し、`InitContainer` の `appLister` に注入。
- **理由:** DI コンテナファクトリが新しいポートの具象実装を注入する既存パターンに従う。

### 6. `init` コマンドを修正

- **対象ファイル:** `src/cli/commands/init.ts`
- **変更内容:**
  - `space-id` の `required: true` を削除（オプショナルに）
  - `InitCliValues` の `"space-id"` を `string | undefined` に変更
  - `spaceId` のバリデーション（正の整数チェック）を指定時のみ実行するよう条件分岐（truthy チェックで空文字列もスキップ）
  - `spaceId` 指定時: 既存の `fetchSpaceApps` を呼ぶ
  - `spaceId` 未指定時: 新しい `fetchAllApps` を呼ぶ
  - spinner メッセージを分岐: "Fetching space info..." vs "Fetching all apps..."
  - 結果メッセージを分岐: "Found N app(s) in the space." vs "Found N app(s)."
  - コマンドの `description` を `"Initialize project from a kintone space"` → `"Initialize project from kintone"` に更新
- **理由:** Issue の要件を直接満たす変更。既存のスペース指定フローはそのまま維持。

### 7. テストの追加・更新

- **対象ファイル:**
  - `src/core/application/init/__tests__/fetchAllApps.test.ts`（新規）— `fetchAllApps` ユニットテスト
  - `src/cli/commands/__tests__/init.test.ts`（更新）— space-id 未指定時のテストケース追加
- **変更内容:**
  - `fetchAllApps` テスト: InMemory 実装で正常系（複数件）、0件で `NotFoundError`
  - CLI テスト:
    - `vi.mock("@/core/application/init/fetchAllApps")` を追加して `fetchAllApps` をモック
    - `createInitCliContainer` のモック返り値に `appLister` プロパティを追加（既存全テストケースに影響）
    - `space-id` なしで `fetchAllApps` が呼ばれることを確認するテストケース追加
    - `space-id` ありの既存テストがパスすること
- **理由:** 新機能のカバレッジ確保と既存テストの回帰防止

## 設計判断

- **`SpaceApp` 型の再利用**: kintone の `GET /k/v1/apps.json` も `appId`, `code`, `name` を含むため `SpaceApp` 型をそのまま使う。名前が `SpaceApp` なのはやや紛らわしいが、リネームは影響範囲が大きくスコープ外。
- **新ユースケース分離 vs `fetchSpaceApps` 拡張**: 使うポートが異なるため `fetchAllApps` を別関数として追加。CLI 側で分岐する。
- **ポート配置**: `AppLister` は `src/core/domain/app/ports/` に配置。スペースに依存しない責務であるため `space` ドメインではなく新しい `app` ドメインに配置する。`SpaceApp` 型はクロスドメインインポートで参照する。
- **コンテナの `appLister` 必須化**: `KintoneAppLister` のコンストラクタは軽量（API呼び出しなし）のため、`spaceId` 指定時にインスタンス化されても実害なし。

## リスクと注意点

- kintone `getApps` API は1回100件上限。大量アプリ環境ではリクエスト数が増えるが、init は1回限りの操作なので実用上問題なし。
- `GET /k/v1/apps.json` は認証ユーザーが閲覧権限を持つアプリのみ返す。API トークン認証時はトークンに紐づくアプリのみとなる可能性がある。
- 既存テストは `space-id` をオプショナルにしても破壊されない。

## テスト方針

- `fetchAllApps` ユニットテスト（InMemory 実装）
- CLI テスト（space-id 未指定時の分岐）
- `pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test` で全体の品質チェック
- 手動テスト: space-id 未指定・指定の両パターンで動作確認

## 参考: エージェント比較

| 観点 | エージェント1 (アーキテクチャ) | エージェント2 (保守性) | エージェント3 (シンプルさ) |
|------|-------------------------------|------------------------|---------------------------|
| ベース採用 | × | × | ○ |
| 取り込んだ点 | コンテナのappListerを必須に、パフォーマンス考慮の詳細 | テスタビリティの観点でのポート分離の論拠 | — |

## レビュー反映

### 修正した点
- P-001: `AppLister` の配置場所を `src/core/domain/space/ports/` → `src/core/domain/app/ports/` に変更。スペースに依存しない責務であるため、意味的な矛盾を解消。
- P-002/P-003: ページネーション終了条件（`apps.length < 100` で終了）と `getApps` API の呼び出しパラメータを明記。
- P-003: コンテナの `appLister` 必須化について、コンストラクタが軽量である旨を設計判断に補足。

### 取り込んだ改善提案
- S-001/S-002: CLI コマンドの `description` を `"Initialize project from kintone"` に更新する項目を追加。
- S-001/S-003: CLI テストの具体的なモック更新手順（`fetchAllApps` のモック、`createInitCliContainer` モックへの `appLister` 追加）を明記。
- S-003: `fetchAllApps` の 0件時エラーメッセージに API トークン権限のヒントを含めることを明記。

### 見送った提案とその理由
- S-002 (Reviewer 1): API トークン認証時のCLI警告出力 — kintone APIの標準挙動であり、別途ドキュメント対応が適切。スコープ外。
- S-003 (Reviewer 3): `--space-id ""` 空文字列処理の明示 — truthy チェックで自然に処理されるため、特別な対応は不要と判断。ステップ6に truthy チェックの旨を追記済み。
- P-002 (Reviewer 1): `SpaceApp` ではなく新しい `AppSummary` 型を定義する提案 — 構造が完全に同一であり、現時点で新型を作るメリットより複雑性の増加が大きい。将来の型リネーム Issue で対応する。
