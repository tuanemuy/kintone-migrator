# PR Review #002 — feat: init コマンドの --space-id をオプショナル化

**PR:** #129
**Date:** 2026-03-26
**Round:** 2回目

---

## Summary

- Blockers: 0
- Warnings: 7 (4件修正、3件見送り)
- Notes: 12
- Verdict: **BLOCKED** (Warningを修正する)

---

### Domain & Use Case & Adapter

#### Warnings (修正済み)
- **[W-001]** MAX_PAGES到達時のサイレント打ち切り → SystemError スロー追加
- **[W-003]** kintone offset上限 → MAX_PAGES=1000で実質的にカバー済み、見送り

#### Warnings (見送り)
- **[W-002]** FetchAllAppsContainer と InitContainer の重複 → 既存パターンと一致、低優先度
- **[W-003]** kintone getApps offset上限 → ドキュメント記載程度の問題、低優先度

### CLI / Presentation & Test

#### Warnings (修正済み)
- **[W-001]** space-id指定時のfetchAllApps非呼出アサーション追加
- **[W-002]** バリデーションテストのエラー型検証追加
- **[W-003]** space-id: "-1" テストケース追加

#### Warnings (見送り)
- **[W-004]** dry-runテスト → 既存の gap（このPR固有ではない）

---

## Design Decisions

特になし
