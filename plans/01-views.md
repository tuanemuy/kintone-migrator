# 01: 一覧（ビュー）設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getViews()` / `client.app.updateViews()` を使用

## 公式ドキュメント

- 一覧の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/get-views/>
- 一覧の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/view/update-views/>

## APIレスポンス構造

```
GET /k/v1/app/views.json → { views: { [name]: ViewConfig }, revision }
PUT /k/v1/preview/app/views.json ← { app, views: { [name]: ViewConfig }, revision? }
```

各ビューのプロパティ:
- 共通: `type`（LIST/CALENDAR/CUSTOM）, `name`, `id`, `index`, `filterCond`, `sort`
- LIST: `fields`（表示フィールドコード配列）
- CALENDAR: `date`, `title`（フィールドコード）
- CUSTOM: `html`, `pager`, `device`（DESKTOP/ANY）
- 特殊: `builtinType`（組み込みビュー。例: "ASSIGNEE"）

## YAMLスキーマ例

```yaml
views:
  タスク一覧:
    type: LIST
    index: 0
    fields: [タイトル, ステータス, 担当者]
    filterCond: "ステータス in (\"未着手\", \"進行中\")"
    sort: "更新日時 desc"
  カレンダー:
    type: CALENDAR
    index: 1
    date: 期限
    title: タイトル
  カスタムビュー:
    type: CUSTOM
    index: 2
    html: "<div id='custom-view'></div>"
    pager: true
    device: DESKTOP
```

## コマンド

| コマンド | 説明 |
|---|---|
| `view capture` | 現在のビュー設定をYAMLに出力 |
| `view apply` | YAMLからビュー設定を適用（デプロイ含む） |
| `view diff` | 現在の設定とYAMLの差分を表示 |

## 作成するファイル

```
src/core/domain/view/
  entity.ts, valueObject.ts, errorCode.ts
  ports/viewConfigurator.ts, ports/viewStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/viewConfigurator.ts
src/core/adapters/local/viewStorage.ts

src/core/application/container/view.ts
src/core/application/view/
  captureView.ts, applyView.ts, parseConfig.ts, saveView.ts, __tests__/

src/cli/commands/view/
  index.ts, capture.ts, apply.ts, diff.ts, __tests__/
```

## 実装上の注意

- `builtinType` が設定されたビュー（作業者が自分）はcapture時に含めるが、apply時はスキップまたは警告
- `id` はkintone内部IDのためYAMLには含めない（名前でマッチング）
- デプロイが必要（`appDeployer.deploy()`）
