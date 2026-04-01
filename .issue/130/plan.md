# 実装計画 — Issue #130: SpaceApp 型を汎用的な名前にリネーム

**Issue:** #130
**作成日:** 2026-04-02

---

## 目的

`SpaceApp` 型を `AppInfo` にリネームし、`space` ドメインから `app` ドメインに移動する。Issue #128 の対応で `SpaceApp` がスペースに属さないアプリにも使われるようになったため、型名とドメイン配置を実態に合わせる。

## スコープ

### 含まれるもの
- `SpaceApp` 型を `AppInfo` にリネーム
- `SpaceApp` 型と `resolveAppName` 関数を `space/entity.ts` から `app/entity.ts` に移動
- テストファイルの移動（`space/__tests__/entity.test.ts` → `app/__tests__/entity.test.ts`）
- 全参照ファイル（約14ファイル）のインポートパスと型名の更新
- 旧ファイル（`space/entity.ts`, `space/__tests__/entity.test.ts`）の削除

### 含まれないもの
- `SpaceReader` ポートのリネームやドメイン移動
- ロジックの変更（純粋なリネーム＋ファイル移動のみ）
- `space` ドメインディレクトリの削除（`ports/spaceReader.ts` が残るため維持）

## 実装ステップ

### 1. `src/core/domain/app/entity.ts` を新規作成

- **対象ファイル:** `src/core/domain/app/entity.ts`（新規）
- **変更内容:** `src/core/domain/space/entity.ts` の全内容（`SpaceApp` 型、`resolveAppName` 関数、`sanitizeForFileSystem` ヘルパー、`UNSAFE_PATH_CHARS` 定数）を移動し、`SpaceApp` を `AppInfo` にリネーム。
- **理由:** `AppLister` ポートが既に `app` ドメインにあり、その戻り値型も同じドメインに置くのが自然。

### 2. テストファイルの移動

- **対象ファイル:** `src/core/domain/app/__tests__/entity.test.ts`（新規）
- **変更内容:** `src/core/domain/space/__tests__/entity.test.ts` の内容を移動し、`SpaceApp` → `AppInfo` にリネーム、インポートパスを更新。
- **理由:** テストは型・関数の移動に追従する。

### 3. ドメイン層ポートの更新

- **対象ファイル:**
  - `src/core/domain/app/ports/appLister.ts` — `import type { SpaceApp } from "../../space/entity"` → `import type { AppInfo } from "../entity"`、戻り値型 `SpaceApp[]` → `AppInfo[]`
  - `src/core/domain/space/ports/spaceReader.ts` — `import type { SpaceApp } from "../entity"` → `import type { AppInfo } from "@/core/domain/app/entity"`、戻り値型 `SpaceApp[]` → `AppInfo[]`
- **理由:** 型の移動とリネームに追従。`AppLister` は同ドメイン内参照のため相対パス（`"../entity"`）を使用。`SpaceReader` は `space` → `app` のクロスドメイン参照のため `@/` エイリアスパスを使用（既存コードベースの慣習に合わせる）。

### 5. アダプタ層の更新

- **対象ファイル:**
  - `src/core/adapters/kintone/appLister.ts` — インポート元を `@/core/domain/app/entity` に変更、`SpaceApp` → `AppInfo`（インポート文、ローカル変数型 `const result: SpaceApp[]` → `AppInfo[]`）
  - `src/core/adapters/kintone/spaceReader.ts` — インポート元を `@/core/domain/app/entity` に変更、`SpaceApp` → `AppInfo`（インポート文、ローカル変数型 `const result: SpaceApp[]` → `AppInfo[]`）
- **理由:** 型移動とリネームに追従。インポート文だけでなく、ファイル内の全 `SpaceApp` 出現箇所（ローカル変数型注釈を含む）を `AppInfo` に一括置換する。

### 6. アプリケーション層の更新

- **対象ファイル:**
  - `src/core/application/init/fetchAllApps.ts` — インポート元を `@/core/domain/app/entity` に変更、`SpaceApp` → `AppInfo`（インポート文、戻り値型 `Promise<readonly SpaceApp[]>` → `Promise<readonly AppInfo[]>`）
  - `src/core/application/init/fetchSpaceApps.ts` — インポート元を `@/core/domain/app/entity` に変更、`SpaceApp` → `AppInfo`（インポート文、戻り値型）
  - `src/core/application/init/generateProjectConfig.ts` — インポート元を `@/core/domain/app/entity` に変更、`SpaceApp` → `AppInfo`（インポート文、入力型 `apps: SpaceApp[]` → `AppInfo[]`）、`resolveAppName` のインポート元も更新
- **理由:** 型と関数の移動に追従。各ファイル内の全 `SpaceApp` 出現箇所（インポート、戻り値型、引数型）を `AppInfo` に一括置換する。

### 7. プレゼンテーション層の更新

- **対象ファイル:** `src/cli/commands/init.ts`
- **変更内容:** `import { resolveAppName, type SpaceApp } from "@/core/domain/space/entity"` → `import { resolveAppName, type AppInfo } from "@/core/domain/app/entity"`。ファイル内の `SpaceApp` を全て `AppInfo` に変更。
- **理由:** 型と関数の移動に追従。

### 8. テストファイルの更新

- **対象ファイル:**
  - `src/core/application/init/__tests__/fetchAllApps.test.ts`
  - `src/core/application/init/__tests__/fetchSpaceApps.test.ts`
  - `src/core/application/init/__tests__/generateProjectConfig.test.ts`
- **変更内容:** 各ファイルの `SpaceApp` インポートを `AppInfo` に変更、インポートパスを `@/core/domain/app/entity` に更新。
- **理由:** 型移動とリネームに追従。

※ `src/cli/commands/__tests__/init.test.ts` は `SpaceApp` 型を直接インポートしていないため変更不要。モックの戻り値はオブジェクトリテラルで記述されており、TypeScript の構造的型付けにより `AppInfo` にも適合するため型エラーは発生しない。

### 8. 旧ファイルの削除

- **対象ファイル:**
  - `src/core/domain/space/entity.ts` — 削除
  - `src/core/domain/space/__tests__/entity.test.ts` — 削除
- **変更内容:** 全コンテンツが `app/entity.ts` に移動済み、かつ全参照ファイルのインポートパスを更新済みのため削除。
- **理由:** re-export を残さない（旧パスからのインポートが可能な状態は目的に反する）。全参照の更新後に削除することで、安全な中間状態を維持する。

### 9. 品質チェック

- `pnpm typecheck` で型エラーがないことを確認
- `pnpm lint:fix` でリントエラーを修正
- `pnpm format` でフォーマットを統一
- `pnpm test` で全テストがパスすることを確認
- `SpaceApp` の残存チェック（grep で確認）

## 設計判断

- **型名: `AppInfo` を採用** — `AppSummary` は「要約版がある＝詳細版もある」を暗示するが、このプロジェクトに `App` の完全版は存在しない。`AppInfo` は「アプリの基本情報」という意味でシンプルかつ汎用的。
- **`resolveAppName` は `app/entity.ts` に配置** — 引数が `AppInfo` に密結合した純粋関数であり、既存パターン（entity.ts にドメインロジック関数が同居）に整合。services/ への分離は YAGNI。
- **`space/entity.ts` は削除、re-export なし** — re-export を残すとリネームの目的（意味の正しいドメイン配置）が損なわれる。TypeScript の型チェックが更新漏れを確実に検出するため安全に実行可能。
- **`space` → `app` の依存方向は許容** — `SpaceReader` が `AppInfo` を返す形で `space` → `app` の依存が発生するが、`AppInfo` はアプリの基本情報を表す汎用型であり適切。逆に `app` → `space` への依存が解消されるため、依存関係は改善される。
- **インポートパスの規約** — 同ドメイン内参照は相対パス、クロスドメイン参照は `@/` エイリアスパスを使用。既存コードベース（アダプタ層など）の慣習に合わせる。

## リスクと注意点

- 約14ファイルの一括変更だが、全て機械的なリネーム＋インポートパス変更であり、`pnpm typecheck` で更新漏れを完全に検出可能。リスクは低い。
- ランタイムのロジックやデータフローに変更はなく、パフォーマンスへの影響はゼロ。
- Issue 本文では「30以上のファイルから参照」と記載されているが、実際の影響ファイル数は14。PR 作成時にこの点を明記する。

## テスト方針

- `pnpm typecheck`: 全インポートパスと型名の整合性を確認
- `pnpm test`: 全テストパスを確認（特に `resolveAppName` のテストが移動後も全ケース合格すること）
- `pnpm lint:fix && pnpm format`: コード品質の一貫性を確認
- grep で `SpaceApp` の残存がないことを確認

## 参考: エージェント比較

| 観点 | エージェント1 (アーキテクチャ) | エージェント2 (保守性) | エージェント3 (シンプルさ) |
|------|-------------------------------|------------------------|---------------------------|
| ベース採用 | × | × | ○ |
| 取り込んだ点 | 段階的移行の安全策の言及（最終的には不要と判断）、`sanitizeForFileSystem` の明示的な移動対象への言及 | `Readonly<{...}>` パターンの確認、依存関係の整理表 | ベース計画: 最もシンプルで漏れのない手順 |

## レビュー反映

### 修正した点
- 旧ファイル削除のタイミングを全参照更新後（ステップ8）に移動 — 安全な中間状態を維持するため
- 各ステップにローカル変数型注釈・戻り値型の更新も明記 — インポート文のみの記載では更新漏れリスクがあったため
- クロスドメイン参照のインポートパス規約（相対パス vs `@/` エイリアス）を設計判断セクションに追記
- `init.test.ts` が変更不要な理由に構造的型付けの説明を追加

### 取り込んだ改善提案
- Issue 本文のファイル数（30+）と実際の影響ファイル数（14）の乖離をリスクと注意点セクションに明記

### 見送った提案とその理由
- なし（全ての改善提案を取り込んだ）
