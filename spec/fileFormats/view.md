# ビュー設定ファイル仕様

一覧（ビュー）設定の設定ファイルフォーマット。ビューはビュー名をキーとして識別される。

## kintone API リファレンス

- [一覧の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/get-views/)
- [一覧の設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/update-views/)

## フォーマット

YAML形式で記述する。

```yaml
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - customer_name
      - customer_code
      - status
    filterCond: status in ("active")
    sort: customer_code asc
    pager: true
    device: ANY
  カレンダー:
    type: CALENDAR
    index: 1
    date: scheduled_date
    title: customer_name
    filterCond: ""
  カスタムビュー:
    type: CUSTOM
    index: 2
    html: "<div id='my-view'></div>"
    pager: false
```

ビュータイプ: `LIST`, `CALENDAR`, `CUSTOM`

## プロパティ

| プロパティ | 必須 | 対象タイプ | 説明 |
| --- | --- | --- | --- |
| `type` | 必須 | 全タイプ | ビューの種類（`LIST` / `CALENDAR` / `CUSTOM`） |
| `index` | 任意 | 全タイプ | 表示順序。省略時は `0`。非負整数のみ許容（本ツール独自制約。kintone API 上の型は文字列で、送信時に文字列化される） |
| `fields` | 任意 | `LIST` | 一覧に表示するフィールドコードのリスト |
| `date` | 任意 | `CALENDAR` | カレンダーに使用する日付フィールドコード |
| `title` | 任意 | `CALENDAR` | カレンダーのタイトルフィールドコード |
| `html` | 任意 | `CUSTOM` | カスタムビューのHTML |
| `filterCond` | 任意 | 全タイプ | フィルター条件 |
| `sort` | 任意 | 全タイプ | ソート条件 |
| `pager` | 任意 | 全タイプ | ページャーの表示有無（真偽値） |
| `device` | 任意 | 全タイプ | 表示対象デバイス。`DESKTOP` / `ANY` のみ許容 |

- `device` を省略した場合はkintone側のデフォルト（`DESKTOP` 相当）に従う。明示する場合は `DESKTOP` または `ANY` を指定する
- 各ビューは `views` 配下のキー（ビュー名）で識別される。ビュー名は空文字にできない

## バリデーション

パース時に以下を検証する。詳細は [View ドメイン仕様](../domains/view.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `VW_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`views` がオブジェクトでない 等） |
| `VW_INVALID_VIEW_TYPE` | `type` が `LIST` / `CALENDAR` / `CUSTOM` 以外 |
| `VW_INVALID_DEVICE_TYPE` | `device` が `DESKTOP` / `ANY` 以外 |
| `VW_EMPTY_VIEW_NAME` | ビュー名（`views` のキー）が空文字 |
| `VW_INVALID_INDEX` | `index` が非負整数でない |

## エラーコード

| 定数 | コード |
| --- | --- |
| `VwInvalidConfigStructure` | `VW_INVALID_CONFIG_STRUCTURE` |
| `VwInvalidViewType` | `VW_INVALID_VIEW_TYPE` |
| `VwInvalidDeviceType` | `VW_INVALID_DEVICE_TYPE` |
| `VwEmptyViewName` | `VW_EMPTY_VIEW_NAME` |
| `VwInvalidIndex` | `VW_INVALID_INDEX` |
