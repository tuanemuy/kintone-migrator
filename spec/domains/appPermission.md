# AppPermission

## ドメイン名

AppPermission

> ドメイン名は `Permission`、CLI コマンド名は `app-acl` を用いる。これは kintone のアクセス制御リスト（access control list = ACL）に由来する命名であり、ドメイン層では「アクセス権（Permission）」、CLI 層では慣用的な略称 `acl` を採用しているため名称が異なる。
>
> 本ドキュメントでは、設定対象そのもの（kintone の「アクセス権」機能・設定）を指す概念には「アクセス権」を、追加・編集・閲覧といった個々の操作許可を指す場合には「〜権限」（例: レコード閲覧権限）を用いて使い分ける。

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| アプリアクセス権設定 | AppPermissionConfig | アプリのアクセス権の望ましい状態を定義した設定 |
| アプリアクセス権エントリ | AppRight | 特定のエンティティに対するアプリレベルのアクセス権設定 |
| エンティティタイプ | AppPermissionEntityType | アクセス権の対象の種別（USER, GROUP, ORGANIZATION, CREATOR） |
| アプリアクセス権設定差分 | AppPermissionDiff | ローカル設定とリモート設定を比較した差分結果 |

## エンティティ

### AppPermissionConfig

アプリアクセス権の全体設定。設定ファイル単位のまとまりとして扱うルートエンティティ。

```typescript
type AppPermissionConfig = Readonly<{
  rights: readonly AppRight[];
}>;
```

- `rights` の配列順序は意味を持つ。kintone はアプリのアクセス権を上から順に評価し、最初に合致したエンティティの権限を適用するため、順序は評価優先度を表す
- 同一エンティティ（`entity.type` と `entity.code` の組）が重複する場合は `BusinessRuleError(AP_DUPLICATE_ENTITY)` をスローする
- apply は `rights` 全体をリモートに**全置換**で反映する（差分マージではない）。ローカルの設定ファイルに存在しないエンティティの権限はリモートから削除される

## 値オブジェクト

> 本ドメインでは、独立したライフサイクルや同一性（ID）を持つ型を「エンティティ」、不変かつ同一性を持たず値そのもので同値性が決まる型を「値オブジェクト」に分類する。`AppRight` は識別子を持たず、`entity` と各許可フラグの値だけで等価性が決まる不変データであるため、値オブジェクトに分類する。

### AppRight

特定のエンティティに対するアプリレベルのアクセス権設定。

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

- `entity` はアクセス権の対象
- `includeSubs` はサブ組織・サブグループを含めるか
- `appEditable` はアプリの管理権限
- `recordViewable` はレコード閲覧権限
- `recordAddable` はレコード追加権限
- `recordEditable` はレコード編集権限
- `recordDeletable` はレコード削除権限
- `recordImportable` はファイルからのインポート権限
- `recordExportable` はファイルへのエクスポート権限

### AppPermissionEntityType

アクセス権の対象の種別。

```typescript
type AppPermissionEntityType = "USER" | "GROUP" | "ORGANIZATION" | "CREATOR";
```

- `USER`: 特定のkintoneユーザー
- `GROUP`: kintoneグループ
- `ORGANIZATION`: kintone組織
- `CREATOR`: レコードの作成者（kintone が提供する特殊エンティティ）
- 「すべてのユーザー（EVERYONE）」は専用のエンティティタイプではなく、`type: "GROUP"`・`code: "everyone"` という kintone 組み込みの擬似グループとして表現する。設定ファイル・ドメインモデルとも他のグループと同一の構造で扱う

### AppPermissionEntity

アクセス権の対象の識別情報。

```typescript
type AppPermissionEntity = Readonly<{
  type: AppPermissionEntityType;
  code: string;
}>;
```

- `code` の要否はエンティティタイプによって異なる
  - `USER`・`GROUP`・`ORGANIZATION`: `code`（ユーザー名・グループコード・組織コード）が必須。空文字の場合は `BusinessRuleError(AP_EMPTY_ENTITY_CODE)` をスローする。EVERYONE は `GROUP` の特例として `code: "everyone"` を指定する
  - `CREATOR`: kintone が提供する特殊エンティティであり識別コードを持たないため、`code` は省略可能（空文字でもよい）

## ドメインサービス

### AppPermissionConfigParser

パース済みの設定データ（`unknown`）を検証し、`AppPermissionConfig` に変換する純粋関数。違反時は以下のエラーコードを持つ `BusinessRuleError` をスローする。

| エラーコード | 発生条件 |
| --- | --- |
| `AP_INVALID_CONFIG_STRUCTURE` | 構造が不正（オブジェクトでない、`rights` 配列を持たない等） |
| `AP_INVALID_ENTITY_TYPE` | `entity.type` が許可された種別（USER/GROUP/ORGANIZATION/CREATOR）以外 |
| `AP_INVALID_BOOLEAN_FIELD` | 権限フィールド（`appEditable` 等）が真偽値でない |
| `AP_EMPTY_ENTITY_CODE` | `CREATOR` 以外のエンティティで `code` が空 |
| `AP_DUPLICATE_ENTITY` | 同一エンティティ（`type` と `code` の組）が `rights` 内で重複 |

### AppPermissionConfigSerializer

`AppPermissionConfig` をシリアライズ用のプレーンなデータ（`Record<string, unknown>`）に変換する純粋関数。

### AppPermissionDiffDetector

ローカル設定（望ましい状態）とリモート設定（現在の状態）を比較し、`AppPermissionDiff` を返す純粋関数。エンティティの順序も差分判定に含める（kintone のアクセス権評価では順序が優先度を意味するため）。

## ポート

### AppPermissionConfigurator

kintoneアプリのアクセス権を取得・更新するためのインターフェース。

```typescript
interface AppPermissionConfigurator {
  getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }>;
  updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getAppPermissions()` は現在のアプリアクセス権をドメイン型に変換して返す。`revision` はkintone APIが返す楽観ロック用のトークン
- `updateAppPermissions()` はアプリアクセス権を**全置換**で更新する。`revision` を指定した場合は楽観ロックが働き、リモートのリビジョンと一致しなければ更新は失敗する。`revision` を省略した場合は強制上書きとなる
- apply は capture 時に取得した `revision` を `updateAppPermissions()` に渡すことで、取得から更新までの間にリモートが変更された場合の競合を検出する
- 更新後の新しい `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### AppPermissionStorage

アプリアクセス権設定テキストを永続化・取得するためのインターフェース。`ConfigStorage` を継承する。

```typescript
interface AppPermissionStorage extends ConfigStorage {}

interface ConfigStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする

## 設定ファイルのフォーマット

[アプリアクセス権設定ファイル仕様](../fileFormats/appPermission.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `app-acl apply` | YAML設定ファイルからアプリのアクセス権を適用する |
| `app-acl capture` | 現在のアプリのアクセス権をYAMLファイルに保存する |
| `app-acl diff` | ローカルのアプリアクセス権設定とリモートのkintoneアプリの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--app-acl-file` | `APP_ACL_FILE_PATH` | アプリACL設定ファイルパス（デフォルト: `app-acl.yaml`、マルチアプリ: `app-acl/<appName>.yaml`） |
