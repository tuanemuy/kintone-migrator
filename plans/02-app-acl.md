# 02: アプリのアクセス権管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- kintone JS SDK の `client.app.getAppAcl()` / `client.app.updateAppAcl()` を使用

## 公式ドキュメント

- アプリのアクセス権の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-app-permissions/>
- アプリのアクセス権の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-app-permissions/>

## APIレスポンス構造

```
GET /k/v1/app/acl.json → { rights: AppRight[], revision }
PUT /k/v1/preview/app/acl.json ← { app, rights: AppRight[], revision? }
```

AppRightのプロパティ:
- `entity.type`: USER / GROUP / ORGANIZATION / CREATOR
- `entity.code`: ログイン名、グループコード等（CREATORの場合はnull）
- `includeSubs`: 下位組織への継承
- `appEditable`: アプリ管理権限
- `recordViewable`, `recordAddable`, `recordEditable`, `recordDeletable`
- `recordImportable`, `recordExportable`

## YAMLスキーマ例

```yaml
rights:
  - entity:
      type: GROUP
      code: Administrators
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
    includeSubs: false
  - entity:
      type: GROUP
      code: everyone
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
    includeSubs: false
```

## コマンド

| コマンド | 説明 |
|---|---|
| `app-acl capture` | 現在のアプリアクセス権をYAMLに出力 |
| `app-acl apply` | YAMLからアプリアクセス権を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/appPermission/
  entity.ts, valueObject.ts, errorCode.ts
  ports/appPermissionConfigurator.ts, ports/appPermissionStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/appPermissionConfigurator.ts
src/core/adapters/local/appPermissionStorage.ts

src/core/application/container/appPermission.ts
src/core/application/appPermission/
  captureAppPermission.ts, applyAppPermission.ts, parseConfig.ts, saveAppPermission.ts, __tests__/

src/cli/commands/app-acl/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- `fieldPermission` と entity/valueObject の型が類似する（`EntityType` 等）。共通化するか、ドメインごとに独立定義するか判断が必要
- rights配列の順序が優先度を表すため、YAML上の順序を維持する
- デプロイが必要
