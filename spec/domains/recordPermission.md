# RecordPermission

## ドメイン名

RecordPermission

> ドメイン名は `Permission`、CLI コマンド名は `record-acl` を用いる。これは kintone のアクセス制御リスト（access control list = ACL）に由来する命名であり、ドメイン層では「アクセス権（Permission）」、CLI 層では慣用的な略称 `acl` を採用しているため名称が異なる。

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| レコードアクセス権設定 | RecordPermissionConfig | レコードのアクセス権の望ましい状態を定義した設定 |
| レコードアクセス権 | RecordRight | 特定の条件に合致するレコードに対するアクセス権設定 |
| レコードアクセス権エンティティ | RecordPermissionRightEntity | レコードに対する個別のアクセス権設定 |
| レコードアクセス権設定差分 | RecordPermissionDiff | ローカル設定とリモート設定を比較した差分結果 |

## エンティティ

### RecordRight

特定の条件に合致するレコードに対するアクセス権設定。

```typescript
type RecordRight = Readonly<{
  filterCond: string;
  entities: readonly RecordPermissionRightEntity[];
}>;
```

- `filterCond` はレコードのフィルター条件（空文字列の場合は全レコードが対象）
- `entities` はアクセス権エンティティのリスト

### RecordPermissionConfig

レコードアクセス権の全体設定。

```typescript
type RecordPermissionConfig = Readonly<{
  rights: readonly RecordRight[];
}>;
```

- `rights` の配列順序は意味を持つ。kintone はレコードアクセス権を上から順に評価し、最初に合致した条件の権限を適用するため、順序は評価優先度を表す
- 各 `RecordRight` の `entities` 内で同一エンティティ（`entity.type` と `entity.code` の組）が重複する場合は `BusinessRuleError(RP_DUPLICATE_ENTITY)` をスローする
- apply は `rights` 全体をリモートに**全置換**で反映する（差分マージではない）。ローカルの設定ファイルに存在しない条件・エンティティの権限はリモートから削除される

## 値オブジェクト

### RecordPermissionEntityType

アクセス権の対象の種別。

```typescript
type RecordPermissionEntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";
```

- `USER`: 特定のkintoneユーザー
- `GROUP`: kintoneグループ
- `ORGANIZATION`: kintone組織
- `FIELD_ENTITY`: フィールドベースのエンティティ（作成者、更新者など）
- 「すべてのユーザー（EVERYONE）」は専用のエンティティタイプではなく、`type: "GROUP"`・`code: "everyone"` という kintone 組み込みの擬似グループとして表現する

### RecordPermissionEntity

アクセス権の対象の識別情報。

```typescript
type RecordPermissionEntity = Readonly<{
  type: RecordPermissionEntityType;
  code: string;
}>;
```

- いずれの種別でも `code` は必須であり、空文字の場合は `BusinessRuleError(RP_EMPTY_ENTITY_CODE)` をスローする（EVERYONE は `GROUP` の特例として `code: "everyone"` を指定する）

### RecordPermissionRightEntity

レコードに対する個別のアクセス権設定。

```typescript
type RecordPermissionRightEntity = Readonly<{
  entity: RecordPermissionEntity;
  viewable: boolean;
  editable: boolean;
  deletable: boolean;
  includeSubs: boolean;
}>;
```

## ドメインサービス

### RecordPermissionConfigParser

パース済みの設定データ（`unknown`）を検証し、`RecordPermissionConfig` に変換する純粋関数。違反時は以下のエラーコードを持つ `BusinessRuleError` をスローする。

| エラーコード | 発生条件 |
| --- | --- |
| `RP_INVALID_CONFIG_STRUCTURE` | 構造が不正（オブジェクトでない、`rights`/`entities` 配列を持たない等） |
| `RP_INVALID_ENTITY_TYPE` | `entity.type` が許可された種別（USER/GROUP/ORGANIZATION/FIELD_ENTITY）以外 |
| `RP_EMPTY_ENTITY_CODE` | `entity.code` が空 |
| `RP_INVALID_PERMISSION_VALUE` | 権限フィールド（`viewable` 等）が真偽値でない |
| `RP_DUPLICATE_ENTITY` | 同一 `filterCond` 内でエンティティ（`type` と `code` の組）が重複 |

### RecordPermissionConfigSerializer

`RecordPermissionConfig` をシリアライズ用のプレーンなデータ（`Record<string, unknown>`）に変換する純粋関数。

### RecordPermissionDiffDetector

ローカル設定（望ましい状態）とリモート設定（現在の状態）を比較し、`RecordPermissionDiff` を返す純粋関数。`rights` の順序も差分判定に含める（kintone のレコードアクセス権評価では順序が優先度を意味するため）。

## ポート

### RecordPermissionConfigurator

kintoneアプリのレコードアクセス権を取得・更新するためのインターフェース。

```typescript
interface RecordPermissionConfigurator {
  getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }>;
  updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getRecordPermissions()` は現在のレコードアクセス権をドメイン型に変換して返す。`revision` はkintone APIが返す楽観ロック用のトークン
- `updateRecordPermissions()` はレコードアクセス権を**全置換**で更新する。`revision` を指定した場合は楽観ロックが働き、リモートのリビジョンと一致しなければ更新は失敗する。`revision` を省略した場合は強制上書きとなる
- apply は capture 時に取得した `revision` を `updateRecordPermissions()` に渡すことで、取得から更新までの間にリモートが変更された場合の競合を検出する
- 更新後の新しい `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### RecordPermissionStorage

レコードアクセス権設定テキストを永続化・取得するためのインターフェース。`ConfigStorage` を継承する。

```typescript
interface RecordPermissionStorage extends ConfigStorage {}

interface ConfigStorage {
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `update()` はファイルに設定テキストを書き込む
- ファイル操作に失敗した場合は `SystemError` をスローする

## 設定ファイルのフォーマット

[レコードアクセス権設定ファイル仕様](../fileFormats/recordPermission.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `record-acl apply` | YAML設定ファイルからレコードのアクセス権を適用する |
| `record-acl capture` | 現在のレコードのアクセス権をYAMLファイルに保存する |
| `record-acl diff` | ローカルのレコードアクセス権設定とリモートのkintoneアプリの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--record-acl-file` | `RECORD_ACL_FILE_PATH` | レコードACL設定ファイルパス（デフォルト: `record-acl.yaml`、マルチアプリ: `record-acl/<appName>.yaml`） |
