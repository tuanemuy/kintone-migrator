# 03: レコードのアクセス権管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getRecordAcl()` / `client.app.updateRecordAcl()` を使用

## 公式ドキュメント

- レコードのアクセス権の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-record-permissions/>
- レコードのアクセス権の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-record-permissions/>

## APIレスポンス構造

```
GET /k/v1/app/record/acl.json → { rights: RecordRight[], revision }
PUT /k/v1/preview/app/record/acl.json ← { app, rights: RecordRight[], revision? }
```

RecordRightのプロパティ:
- `filterCond`: レコード条件（クエリ形式）
- `entities[]`:
  - `entity.type`: USER / GROUP / ORGANIZATION / FIELD_ENTITY
  - `entity.code`: 識別子
  - `viewable`, `editable`, `deletable`: boolean
  - `includeSubs`: 下位組織への継承

## YAMLスキーマ例

```yaml
rights:
  - filterCond: "部門 in (\"営業部\")"
    entities:
      - entity:
          type: ORGANIZATION
          code: 営業部
        viewable: true
        editable: true
        deletable: false
        includeSubs: true
  - filterCond: ""
    entities:
      - entity:
          type: GROUP
          code: everyone
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
```

## コマンド

| コマンド | 説明 |
|---|---|
| `record-acl capture` | 現在のレコードアクセス権をYAMLに出力 |
| `record-acl apply` | YAMLからレコードアクセス権を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/recordPermission/
  entity.ts, valueObject.ts, errorCode.ts
  ports/recordPermissionConfigurator.ts, ports/recordPermissionStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/recordPermissionConfigurator.ts
src/core/adapters/local/recordPermissionStorage.ts

src/core/application/container/recordPermission.ts
src/core/application/recordPermission/
  captureRecordPermission.ts, applyRecordPermission.ts, parseConfig.ts, saveRecordPermission.ts, __tests__/

src/cli/commands/record-acl/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- `filterCond` のバリデーションは行わない（kintone側で検証される）
- `FIELD_ENTITY` タイプ（作成者フィールド等）をサポートする（`field-acl` と同様）
- rights配列の順序が優先度を表す
- デプロイが必要
