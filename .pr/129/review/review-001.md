# PR Review #001 — feat: init コマンドの --space-id をオプショナル化

**PR:** #129
**Date:** 2026-03-26
**Round:** 1回目

---

## Summary

- Blockers: 0
- Warnings: 6
- Notes: 10
- Verdict: **BLOCKED** (Warningを修正する)

---

### Domain & Use Case

#### Blockers
なし

#### Warnings
- **[W-001]** `app` ドメインが `space` ドメインの `SpaceApp` 型に依存しており、ドメイン間の依存方向が意味的に逆転している
  - 場所: `src/core/domain/app/ports/appLister.ts:1`
  - 理由: `AppLister` は全アプリを取得するポートだが、戻り値型が `SpaceApp`。ただし plan.md でリネームはスコープ外と判断済み。
  - 提案: 低優先度。このPRでは対応しない（スコープ外、plan.md の判断を尊重）

- **[W-002]** kintone のアプリコード未設定時に `code` が空文字列で返される点についてアダプタ内にコメントがない
  - 場所: `src/core/adapters/kintone/appLister.ts:22-26`
  - 理由: `resolveAppName` で正しく処理されるが、アダプタで意識的にそのまま渡していることを明示すべき
  - 提案: コメントを追加

#### Notes
- [N-001] `AppLister` ポートの設計は適切。`SpaceReader` とは別ポートに分離した判断は正しい。
- [N-002] `fetchAllApps` は `fetchSpaceApps` と対称的構造で一貫性が高い。
- [N-003] エラーハンドリングが既存パターンに完全準拠。

---

### Infrastructure / Adapter

#### Blockers
なし

#### Warnings
- **[W-003]** ページネーション途中の API エラーで取得済み件数がエラーメッセージに含まれない
  - 場所: `src/core/adapters/kintone/appLister.ts:38-39`
  - 理由: デバッグ時に途中まで取得できた件数がわかると有用
  - 提案: `wrapKintoneError(error, \`Failed to get apps (fetched ${result.length} so far)\`)` に変更

- **[W-004]** 無限ループ防止のセーフガードがない
  - 場所: `src/core/adapters/kintone/appLister.ts:14,34`
  - 理由: API が常に `PAGE_LIMIT` 件返すバグがあった場合、無限リクエストになる
  - 提案: ループ回数に上限を設ける（例: `MAX_PAGES = 1000`）

#### Notes
- [N-004] ページネーション実装パターンは正しい。
- [N-005] 型マッピングは正確。SDK の型定義を活用。
- [N-006] `PAGE_LIMIT = 100` 定数化は適切。

---

### CLI / Presentation & Test

#### Blockers
なし

#### Warnings
- **[W-005]** `fetchAllApps` エラー時のテストが欠けている
  - 場所: `src/cli/commands/__tests__/init.test.ts`
  - 理由: 既存の `fetchSpaceApps` にはエラー→`handleCliError` のテストがあるが、`fetchAllApps` には対応するテストがない
  - 提案: `fetchAllApps` がエラーをスローした場合に `handleCliError` が呼ばれることを確認するテストを追加

- **[W-006]** `space-id` のバリデーション分岐のテストが存在しない
  - 場所: `src/cli/commands/__tests__/init.test.ts`
  - 理由: `spaceId &&` ガード追加により条件式が変更されたが、テストなし
  - 提案: `space-id: "0"` でバリデーションエラー、`space-id: undefined` でスキップのテスト追加

#### Notes
- [N-007] ヘルパー関数抽出は適切。
- [N-008] spinner メッセージの分岐はユーザーにわかりやすい。
- [N-009] `fetchAllApps` のユースケーステストは既存パターンと一貫性がある。
- [N-010] description の更新は適切。

---

## Design Decisions

特になし
