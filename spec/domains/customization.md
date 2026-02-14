# Customization

## ドメイン名

Customization

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| カスタマイズ設定 | CustomizationConfig | JS/CSSカスタマイズの望ましい状態を定義した設定 |
| カスタマイズスコープ | CustomizationScope | カスタマイズの適用範囲（ALL, ADMIN, NONE） |
| ローカルファイルリソース | LocalFileResource | ローカルファイルシステム上のJS/CSSファイル |
| URLリソース | UrlResource | 外部URL経由のJS/CSSリソース |
| カスタマイズリソース | CustomizationResource | ローカルファイルまたはURLリソースの総称 |
| アップロード済みファイルリソース | UploadedFileResource | kintoneにアップロード済みのファイル（fileKey付き） |
| 解決済みリソース | ResolvedResource | アップロード済みファイルまたはURLリソース。kintone APIに送信可能な形式 |
| リモートファイルリソース | RemoteFileResource | kintone上の既存ファイルリソース |
| リモートリソース | RemoteResource | kintone上の既存リソース（ファイルまたはURL） |
| プラットフォーム設定 | CustomizationPlatform | プラットフォーム（desktop/mobile）ごとのJS/CSS設定 |

## エンティティ

### CustomizationConfig

JS/CSSカスタマイズの望ましい状態を定義する設定。ローカル設定ファイルから読み込まれる。

```typescript
type CustomizationConfig = Readonly<{
  scope: CustomizationScope | undefined;
  desktop: CustomizationPlatform;
  mobile: CustomizationPlatform;
}>;
```

- `scope` が `undefined` の場合、既存のscopeを変更しない
- `desktop` と `mobile` は独立したプラットフォーム設定を持つ
- 不変（Readonly）であり、変更操作は新しいインスタンスを生成する

## 値オブジェクト

### CustomizationScope

カスタマイズの適用範囲。

```typescript
type CustomizationScope = "ALL" | "ADMIN" | "NONE";
```

- `ALL`: すべてのユーザーに適用
- `ADMIN`: 管理者のみに適用
- `NONE`: 無効

### LocalFileResource

ローカルファイルシステム上のリソース。

```typescript
type LocalFileResource = Readonly<{
  type: "FILE";
  path: string;
}>;
```

### UrlResource

外部URL経由のリソース。

```typescript
type UrlResource = Readonly<{
  type: "URL";
  url: string;
}>;
```

### CustomizationResource

設定ファイルに記述されるリソース。ローカルファイルまたはURLのユニオン型。

```typescript
type CustomizationResource = LocalFileResource | UrlResource;
```

### UploadedFileResource

kintoneにアップロード済みのファイルリソース。

```typescript
type UploadedFileResource = Readonly<{
  type: "FILE";
  fileKey: string;
  name: string;
}>;
```

### ResolvedResource

kintone APIに送信可能な形式のリソース。アップロード済みファイルまたはURL。

```typescript
type ResolvedResource = UploadedFileResource | UrlResource;
```

### RemoteFileResource

kintone上の既存ファイルリソース。

```typescript
type RemoteFileResource = Readonly<{
  type: "FILE";
  file: Readonly<{
    fileKey: string;
    name: string;
    contentType: string;
    size: string;
  }>;
}>;
```

### RemoteResource

kintone上の既存リソース。

```typescript
type RemoteResource = RemoteFileResource | UrlResource;
```

### CustomizationPlatform

プラットフォームごとのJS/CSS設定。

```typescript
type CustomizationPlatform = Readonly<{
  js: readonly CustomizationResource[];
  css: readonly CustomizationResource[];
}>;
```

### ResolvedPlatform

解決済みのプラットフォーム設定。

```typescript
type ResolvedPlatform = Readonly<{
  js: readonly ResolvedResource[];
  css: readonly ResolvedResource[];
}>;
```

### RemotePlatform

kintone上の既存プラットフォーム設定。

```typescript
type RemotePlatform = Readonly<{
  js: readonly RemoteResource[];
  css: readonly RemoteResource[];
}>;
```

## ドメインサービス

### ConfigParser

カスタマイズ設定のYAMLテキストをパースする純粋関数。

```typescript
const ConfigParser = {
  parse: (rawText: string): CustomizationConfig;
};
```

- 空テキストの場合は `BusinessRuleError(EmptyConfigText)` をスローする
- YAML構文が不正な場合は `BusinessRuleError(InvalidConfigYaml)` をスローする
- 構造が不正な場合は `BusinessRuleError(InvalidConfigStructure)` をスローする
- scopeが不正な値の場合は `BusinessRuleError(InvalidScope)` をスローする
- リソースtypeが不正な場合は `BusinessRuleError(InvalidResourceType)` をスローする

#### 設定ファイルのフォーマット

YAML形式で記述する。

```yaml
scope: ALL
desktop:
  js:
    - type: FILE
      path: ./dist/desktop.js
    - type: URL
      url: https://cdn.example.com/lib.js
  css:
    - type: FILE
      path: ./styles/desktop.css
mobile:
  js:
    - type: FILE
      path: ./dist/mobile.js
  css: []
```

- `scope` は省略可能。省略時はscopeを変更しない
- `desktop` と `mobile` は必須
- 各プラットフォームの `js` と `css` は配列（空配列も可）
- FILEリソースは `type: FILE` と `path` を持つ
- URLリソースは `type: URL` と `url` を持つ

### ResourceMerger

マージロジックを担うドメインサービス。既存のリモートリソースに対して、新しいリソースをマージする。

```typescript
const ResourceMerger = {
  mergeResources: (
    current: readonly RemoteResource[],
    incoming: readonly ResolvedResource[],
  ): readonly ResolvedResource[];
};
```

- FILEリソース: ファイル名で照合。同名があれば置換、なければ末尾に追加
- URLリソース: URLで照合。同URLがあれば置換、なければ末尾に追加
- 設定ファイルに含まれないリソースは、既存のfileKeyを`ResolvedResource`に変換して保持

## ポート

### CustomizationConfigurator

kintoneアプリのカスタマイズ設定を取得・更新するためのインターフェース。

```typescript
interface CustomizationConfigurator {
  getCustomization(): Promise<{
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }>;
  updateCustomization(params: {
    scope?: CustomizationScope;
    desktop?: { js?: readonly ResolvedResource[]; css?: readonly ResolvedResource[] };
    mobile?: { js?: readonly ResolvedResource[]; css?: readonly ResolvedResource[] };
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getCustomization()` は現在のカスタマイズ設定をドメイン型に変換して返す
- `updateCustomization()` はカスタマイズ設定を更新する
- API通信に失敗した場合は `SystemError` をスローする

### FileUploader

ファイルをkintoneにアップロードするためのインターフェース。

```typescript
interface FileUploader {
  upload(filePath: string): Promise<{ fileKey: string }>;
}
```

- ファイルアップロードに失敗した場合は `SystemError(ExternalApiError)` をスローする

### CustomizationStorage

カスタマイズ設定テキストを永続化・取得するためのインターフェース。

```typescript
interface CustomizationStorage {
  get(): Promise<string>;
}
```

- `get()` はファイルが存在しないまたは空の場合、空文字列 `""` を返す
- API通信に失敗した場合は `SystemError` をスローする

## ユースケース

### applyCustomization

ローカル設定ファイルのJS/CSSリソースをkintoneアプリにアップロードし、カスタマイズ設定にマージ反映する。

- **入力**: `{ basePath: string }` (ファイルパス解決用)
- **出力**: `void`
- **処理フロー**:
    1. `CustomizationStorage.get()` で設定テキストを取得する
    2. `ConfigParser.parse()` でパースする
    3. `CustomizationConfigurator.getCustomization()` で現在の設定を取得する
    4. FILEリソースを `FileUploader.upload()` でアップロードし、fileKeyとnameを取得する
    5. `ResourceMerger.mergeResources()` で現在設定とマージする
    6. マージ後の合計ファイル数が30を超えないかバリデーションする
    7. `CustomizationConfigurator.updateCustomization()` でマージ結果を反映する
- **エラー**:
    - パース失敗 → `BusinessRuleError` を `ValidationError` に変換
    - ファイル数超過 → `BusinessRuleError(TooManyFiles)`
    - API通信失敗 → `SystemError`
