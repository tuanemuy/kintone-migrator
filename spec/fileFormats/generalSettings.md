# 一般設定ファイル仕様

アプリの一般設定の設定ファイルフォーマット。すべてのフィールドはオプショナルで、指定されたフィールドのみが更新される。

## kintone API リファレンス

- [アプリの一般設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-settings/)
- [アプリの一般設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-general-settings/)

## フォーマット

YAML形式で記述する。

```yaml
name: 顧客管理
description: 顧客情報を管理するアプリ
icon:
  type: PRESET
  key: APP006
theme: WHITE
titleField:
  selectionMode: MANUAL
  code: customer_name
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
enableDuplicateRecord: true
enableInlineRecordEditing: true
numberPrecision:
  digits: 16
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
```

## フィールド定義

すべてのプロパティは任意。設定ファイルに記述されたプロパティのみが更新され、未記述のプロパティはリモートの現在値を保持する。

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `name` | string | 任意 | アプリ名 |
| `description` | string | 任意 | アプリの説明 |
| `icon` | IconConfig | 任意 | アプリアイコン |
| `theme` | `"WHITE"` \| `"RED"` \| `"GREEN"` \| `"BLUE"` \| `"YELLOW"` \| `"BLACK"` | 任意 | テーマカラー |
| `titleField` | TitleFieldConfig | 任意 | レコードタイトルに使用するフィールド設定 |
| `enableThumbnails` | boolean | 任意 | サムネイル表示を有効にするか |
| `enableBulkDeletion` | boolean | 任意 | レコードの一括削除を有効にするか |
| `enableComments` | boolean | 任意 | コメント機能を有効にするか |
| `enableDuplicateRecord` | boolean | 任意 | レコードの再利用（複製）を有効にするか |
| `enableInlineRecordEditing` | boolean | 任意 | 一覧でのインライン編集を有効にするか |
| `numberPrecision` | NumberPrecisionConfig | 任意 | 数値計算の精度設定 |
| `firstMonthOfFiscalYear` | number | 任意 | 年度の開始月（1〜12 の整数） |

ネスト値オブジェクト（`icon` / `titleField` / `numberPrecision`）は、指定した場合に**オブジェクト全体が置換される**。子プロパティ単独の部分更新はできないため、指定するときは必須の子プロパティをすべて記述する。

**IconConfig**（`icon.*`）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `type` | `"PRESET"` \| `"FILE"` | 必須 | アイコンの種別 |
| `key` | string | 任意 | プリセットアイコンのキー（`type: PRESET` のとき） |
| `file` | object | 任意 | アップロードしたファイル情報（`type: FILE` のとき） |

**TitleFieldConfig**（`titleField.*`）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `selectionMode` | `"AUTO"` \| `"MANUAL"` | 必須 | タイトルフィールドの選択方式 |
| `code` | string | 任意 | フィールドコード（`selectionMode: MANUAL` のとき指定。`AUTO` では無視される） |

**NumberPrecisionConfig**（`numberPrecision.*`）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `digits` | number | 必須 | 全体の桁数 |
| `decimalPlaces` | number | 必須 | 小数点以下の桁数 |
| `roundingMode` | `"HALF_EVEN"` \| `"UP"` \| `"DOWN"` | 必須 | 端数処理方式 |

## バリデーション

パース時に以下を検証する。詳細は [GeneralSettings ドメイン仕様](../domains/generalSettings.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `GS_INVALID_CONFIG_STRUCTURE` | ルート構造が不正、または `firstMonthOfFiscalYear` が 1〜12 の整数でない 等 |
| `GS_INVALID_THEME` | `theme` が許容値以外 |
| `GS_INVALID_ICON_TYPE` | `icon.type` が `PRESET` / `FILE` 以外 |
| `GS_INVALID_BOOLEAN_FIELD` | `enableComments` 等の真偽値フィールドが真偽値でない |
| `GS_INVALID_NUMBER_PRECISION` | `numberPrecision` の子プロパティ欠落・型不一致 |

## エラーコード

| 定数 | コード |
| --- | --- |
| `GsInvalidConfigStructure` | `GS_INVALID_CONFIG_STRUCTURE` |
| `GsInvalidTheme` | `GS_INVALID_THEME` |
| `GsInvalidIconType` | `GS_INVALID_ICON_TYPE` |
| `GsInvalidBooleanField` | `GS_INVALID_BOOLEAN_FIELD` |
| `GsInvalidNumberPrecision` | `GS_INVALID_NUMBER_PRECISION` |
