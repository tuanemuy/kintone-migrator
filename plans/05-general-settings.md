# 05: 一般設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getGeneralSettings()` / `client.app.updateGeneralSettings()` を使用

## 公式ドキュメント

- アプリの一般設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-settings/>
- アプリの一般設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-general-settings/>

## APIレスポンス構造

```
GET /k/v1/app/settings.json → { name, description, icon, theme, ... , revision }
PUT /k/v1/preview/app/settings.json ← { app, name?, description?, ... , revision? }
```

プロパティ:
- `name`: アプリ名
- `description`: 説明（HTML形式）
- `icon`: `{ type: "PRESET" | "FILE", key }` （FILEの場合はfileKey）
- `theme`: WHITE / RED / GREEN / BLUE / YELLOW / BLACK
- `titleField`: `{ selectionMode: "AUTO" | "MANUAL", code? }`
- `enableThumbnails`, `enableBulkDeletion`, `enableComments`, `enableDuplicateRecord`, `enableInlineRecordEditing`: boolean
- `numberPrecision`: `{ digits, decimalPlaces, roundingMode }` （roundingMode: HALF_EVEN / UP / DOWN）
- `firstMonthOfFiscalYear`: 1-12

## YAMLスキーマ例

```yaml
name: タスク管理
description: "<p>チームのタスクを管理するアプリ</p>"
icon:
  type: PRESET
  key: APP72
theme: WHITE
titleField:
  selectionMode: AUTO
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
enableDuplicateRecord: true
enableInlineRecordEditing: true
numberPrecision:
  digits: 10
  decimalPlaces: 2
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
```

## コマンド

| コマンド | 説明 |
|---|---|
| `settings capture` | 現在の一般設定をYAMLに出力 |
| `settings apply` | YAMLから一般設定を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/generalSettings/
  entity.ts, valueObject.ts, errorCode.ts
  ports/generalSettingsConfigurator.ts, ports/generalSettingsStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/generalSettingsConfigurator.ts
src/core/adapters/local/generalSettingsStorage.ts

src/core/application/container/generalSettings.ts
src/core/application/generalSettings/
  captureGeneralSettings.ts, applyGeneralSettings.ts, parseConfig.ts, saveGeneralSettings.ts, __tests__/

src/cli/commands/settings/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- アイコンが `FILE` タイプの場合はファイルアップロードが必要（`customize` の `fileUploader` パターンを参考）
- `description` はHTML形式。YAMLではそのまま文字列として保持
- YAMLで指定されたプロパティのみ更新する（部分更新）
- デプロイが必要
