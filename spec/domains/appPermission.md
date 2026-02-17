# AppPermission

## ドメイン名

AppPermission

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| アプリアクセス権設定 | AppPermissionConfig | アプリのアクセス権の望ましい状態を定義した設定 |
| アプリ権限 | AppRight | 特定のエンティティに対するアプリレベルの権限設定 |
| エンティティタイプ | AppPermissionEntityType | 権限対象の種別（USER, GROUP, ORGANIZATION, CREATOR） |

## エンティティ

### AppRight

特定のエンティティに対するアプリレベルの権限設定。

```typescript
type AppRight = Readonly<{
  entity: AppPermissionEntity;
  includeSubs: boolean;
  appEditable: boolean;
  recordViewable: boolean;
  recordAddable: boolean;
  recordEditable: boolean;
  recordDeletable: boolean;
  recordImportable: boolean;
  recordExportable: boolean;
}>;
```

- `entity` は権限対象
- `includeSubs` はサブ組織・サブグループを含めるか
- `appEditable` はアプリの管理権限
- `recordViewable` はレコード閲覧権限
- `recordAddable` はレコード追加権限
- `recordEditable` はレコード編集権限
- `recordDeletable` はレコード削除権限
- `recordImportable` はファイルからのインポート権限
- `recordExportable` はファイルへのエクスポート権限

### AppPermissionConfig

アプリアクセス権の全体設定。

```typescript
type AppPermissionConfig = Readonly<{
  rights: readonly AppRight[];
}>;
```

## 値オブジェクト

### AppPermissionEntityType

権限対象の種別。

```typescript
type AppPermissionEntityType = "USER" | "GROUP" | "ORGANIZATION" | "CREATOR";
```

### AppPermissionEntity

権限対象の識別情報。

```typescript
type AppPermissionEntity = Readonly<{
  type: AppPermissionEntityType;
  code: string;
}>;
```

## ポート

### AppPermissionConfigurator

kintoneアプリのアクセス権を取得・更新するためのインターフェース。

### AppPermissionStorage

アプリアクセス権設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
rights:
  - entity:
      type: USER
      code: admin_user
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: GROUP
      code: general_staff
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
```

## CLI

| コマンド | 説明 |
| --- | --- |
| `app-acl apply` | YAML設定ファイルからアプリのアクセス権を適用する |
| `app-acl capture` | 現在のアプリのアクセス権をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--app-acl-file` | `APP_ACL_FILE_PATH` | アプリACL設定ファイルパス（デフォルト: `app-acl.yaml`、マルチアプリ: `app-acl/<appName>.yaml`） |
