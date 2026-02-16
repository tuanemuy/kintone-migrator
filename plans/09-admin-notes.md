# 09: アプリ管理者用メモ管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getAdminNotes()` / `client.app.updateAdminNotes()` を使用

## 公式ドキュメント

- 管理者用メモを取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/get-app-admin-notes/>
- 管理者用メモを変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/update-app-admin-notes/>

## APIレスポンス構造

```
GET /k/v1/app/adminNotes.json → { content, includeInTemplateAndDuplicates, revision }
PUT /k/v1/preview/app/adminNotes.json ← { app, content?, includeInTemplateAndDuplicates?, revision? }
```

- `content`: メモ本文（HTML形式）
- `includeInTemplateAndDuplicates`: テンプレート/複製時に含めるか（boolean）

## YAMLスキーマ例

```yaml
content: |
  <p>このアプリはkintone-migratorで管理されています。</p>
  <p>手動での設定変更は避けてください。</p>
includeInTemplateAndDuplicates: true
```

## コマンド

| コマンド | 説明 |
|---|---|
| `admin-notes capture` | 現在の管理者用メモをYAMLに出力 |
| `admin-notes apply` | YAMLから管理者用メモを適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/adminNotes/
  entity.ts, valueObject.ts, errorCode.ts
  ports/adminNotesConfigurator.ts, ports/adminNotesStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/adminNotesConfigurator.ts
src/core/adapters/local/adminNotesStorage.ts

src/core/application/container/adminNotes.ts
src/core/application/adminNotes/
  captureAdminNotes.ts, applyAdminNotes.ts, parseConfig.ts, saveAdminNotes.ts, __tests__/

src/cli/commands/admin-notes/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- 構造が非常にシンプルなため、最小限の実装で済む
- `content` はHTML形式
- デプロイが必要
