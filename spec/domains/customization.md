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

### RemoteCustomization

kintone上の既存カスタマイズ設定全体。capture / diff でリモート状態をドメイン型として扱うために使用する。

```typescript
type RemoteCustomization = Readonly<{
  scope: CustomizationScope;
  desktop: RemotePlatform;
  mobile: RemotePlatform;
}>;
```

- `CustomizationConfigurator.getCustomization()` の戻り値（`revision` を除いた部分）に相当する
- `scope` は常に確定値（`undefined` を取らない）

### DEFAULT_CUSTOMIZATION_SCOPE

scope 比較時のデフォルト値。ローカル設定で `scope` が省略されている場合に用いる。

```typescript
const DEFAULT_CUSTOMIZATION_SCOPE: CustomizationScope = "ALL";
```

### CustomizationDiffEntry

カスタマイズ設定差分の1エントリ。

```typescript
type CustomizationDiffCategory = "js" | "css" | "scope";

type CustomizationDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  platform: "desktop" | "mobile" | "config";
  category: CustomizationDiffCategory;
  name: string;
  details: string;
}>;
```

- `platform` が `config` の場合は scope の差分を表す（`category: "scope"`, `name: "scope"`）
- FILE/URL リソースの差分は `platform` が `desktop` / `mobile`、`category` が `js` / `css`、`name` がファイル名またはURL
- 読み込み順序の変更は `name: "(order)"` で表現する

### CustomizationDiff

カスタマイズ設定差分の集約結果。共通の `DiffResult` を `CustomizationDiffEntry` で特殊化したもの。

```typescript
type CustomizationDiff = DiffResult<CustomizationDiffEntry>;
```

- `entries`（`added`/`modified`/`deleted` の順にソート済み）、件数サマリ、`isEmpty`、`warnings` を含む

## ドメインサービス

### ConfigParser

パース済みのカスタマイズ設定データを検証し `CustomizationConfig` に変換する純粋関数。

```typescript
const CustomizationConfigParser = {
  parse: (parsed: unknown): CustomizationConfig;
};
```

- 入力はYAMLテキストではなく、アプリケーション層であらかじめパースされた `unknown` データを受け取る（YAMLパースはアプリケーション層の責務。CLAUDE.md 規約に準拠）
- 構造が不正な場合は `BusinessRuleError(CZ_INVALID_CONFIG_STRUCTURE)` をスローする
- scopeが不正な値の場合は `BusinessRuleError(CZ_INVALID_SCOPE)` をスローする
- リソースtypeが不正な場合は `BusinessRuleError(CZ_INVALID_RESOURCE_TYPE)` をスローする
- FILEリソースに非空の `path` がない、URLリソースに非空の `url` がない場合は `BusinessRuleError(CZ_INVALID_CONFIG_STRUCTURE)` をスローする
- `scope` が省略・`null` の場合は `undefined` として保持する（既存scopeを変更しない意図）
- `desktop` / `mobile` が省略・`null` の場合は `{ js: [], css: [] }` として扱う
- 各プラットフォームの `js` / `css` が省略・`null` の場合は空配列として扱う

#### 設定ファイルのフォーマット

[カスタマイズ設定ファイル仕様](../fileFormats/customization.md) を参照。

### ConfigSerializer

`CustomizationConfig` をYAML化可能なプレーンオブジェクト（`Record<string, unknown>`）に変換する純粋関数。capture 時にリモートのカスタマイズ設定を設定ファイルへ書き出すために使用する。

```typescript
const CustomizationConfigSerializer = {
  serialize: (config: CustomizationConfig): Record<string, unknown>;
};
```

- 戻り値はYAML文字列ではなくプレーンオブジェクト（YAML文字列化はアプリケーション層の責務。CLAUDE.md 規約に準拠）
- `scope` が `undefined` の場合は出力に含めない
- プラットフォーム（`desktop` / `mobile`）は `js` / `css` のいずれかにリソースがある場合のみ出力する。両方空の場合はキー自体を省略する
- 各プラットフォーム内でも、空の `js` / `css` 配列はキーを省略する
- FILEリソースは `{ type: "FILE", path }`、URLリソースは `{ type: "URL", url }` として直列化する
- `ConfigParser.parse()` のラウンドトリップと整合する（[ファイルフォーマット仕様](../fileFormats/customization.md) のラウンドトリップ節を参照）

### DiffDetector

ローカル設定（`CustomizationConfig`）とリモート設定（`RemoteCustomization`）を比較し、差分を検出する純粋関数。

```typescript
const CustomizationDiffDetector = {
  detect: (
    local: CustomizationConfig,
    remote: RemoteCustomization,
    modifiedFileNames: ReadonlySet<string>,
  ): CustomizationDiff;
};
```

- `local` と `remote` は意図的に異なる型を用いる。`local` はパース済みのローカル設定（未アップロードのファイルパスを保持）、`remote` はkintone APIから取得した既存設定（fileKey/size 等のメタデータを保持）であり、リソース名/URLで比較することで構造差を吸収する
- **scope**: `local.scope` が `undefined` の場合は `DEFAULT_CUSTOMIZATION_SCOPE`（`ALL`）として扱う。リモートと異なれば `config`/`scope` の modified エントリを生成する
- **FILEリソース**: ファイル名（basename）で照合する。ローカルのみに存在 → added、リモートのみに存在 → deleted
- **content 変更**: 引数 `modifiedFileNames` に含まれるファイル名（ローカル・リモート双方にFILEとして存在し、内容が異なるもの）は modified として報告する。実際のファイル内容比較はアプリケーション層（`detectCustomizationDiff`）が `FileDownloader` / `FileContentReader` を用いて行い、その結果集合をこのサービスへ渡す
- **URLリソース**: URLで照合する。ローカルのみ → added、リモートのみ → deleted
- **読み込み順序**: 共有リソースの並び順が変わった場合は `(order)` という名前の modified エントリを生成する
- **basename 衝突**: 同一プラットフォーム・カテゴリ内でファイル名（basename）が重複する場合は警告（`warnings`）を追加し、順序比較はスキップする
- 結果は `buildDiffResult()` で `added`/`modified`/`deleted` の順にソートされ、件数サマリと警告を含む `CustomizationDiff` として返す

### ResourceMerger

マージロジックとリソース数バリデーションを担うドメインサービス。

```typescript
const ResourceMerger = {
  assertResourceCount: (
    label: string,
    resources: readonly RemoteResource[] | readonly ResolvedResource[],
  ): void;

  mergeResources: (
    current: readonly RemoteResource[],
    incoming: readonly ResolvedResource[],
  ): readonly ResolvedResource[];
};
```

#### assertResourceCount

カテゴリごとのリソース数が上限（30件）を超えていないかバリデーションする。

- 30件以下の場合はエラーなし
- 31件以上の場合は `BusinessRuleError(CZ_TOO_MANY_FILES)` をスローする
- kintone APIの制約に基づくビジネスルール

#### mergeResources

既存のリモートリソースに対して、新しいリソースをマージする。

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
  get(): Promise<{ content: string; exists: boolean }>;
  update(content: string): Promise<void>;
}
```

- 共通の `ConfigStorage` ポートを継承する
- `get()` はファイルの内容と存在有無を返す。ファイルが存在しない場合は `{ content: "", exists: false }` を返す
- `exists` フィールドにより、ファイルが未作成なのか空なのかを区別できる
- `update()` は設定テキストをファイルへ書き込む（capture 結果の保存に使用する）
- API/IO 通信に失敗した場合は `SystemError` をスローする

### FileDownloader

kintone 上の FILE リソースを fileKey から実体（バイナリ）として取得するためのインターフェース。capture 時にリモートの JS/CSS ファイルをダウンロードするために使用する。

```typescript
interface FileDownloader {
  download(fileKey: string): Promise<ArrayBuffer>;
}
```

- ダウンロードに失敗した場合は `SystemError(ExternalApiError)` をスローする

### FileWriter

ダウンロードした FILE リソースの実体をローカルファイルへ保存するためのインターフェース。capture 時に使用する。

```typescript
interface FileWriter {
  write(filePath: string, data: ArrayBuffer): Promise<void>;
}
```

- 書き込みに失敗した場合は `SystemError`（IO 失敗）をスローする

### FileContentReader

ローカルの FILE リソースを読み込むためのインターフェース。diff 時にローカルファイルの内容とリモートの内容を比較するために使用する。

```typescript
interface FileContentReader {
  read(filePath: string): Promise<ArrayBuffer>;
}
```

- 読み込みに失敗した場合は `SystemError`（IO 失敗）をスローする

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
    - ファイル数超過 → `BusinessRuleError(CZ_TOO_MANY_FILES)`
    - API通信失敗 → `SystemError`

### captureCustomization

kintoneアプリの現在のカスタマイズ設定を取得し、FILEリソースの実体をローカルへダウンロードしつつ設定ファイル（YAML）テキストを生成する。

- **入力**: `{ basePath: string; filePrefix: string }`
- **出力**: `{ configText: string; hasExistingConfig: boolean; fileResourceCount: number }`
- **処理フロー**:
    1. `CustomizationStorage.get()` で既存設定の有無を確認する（ダウンロード前に確認し、呼び出し側が早期に上書き判断できるようにする）
    2. `CustomizationConfigurator.getCustomization()` で現在の設定（scope / desktop / mobile）を取得する
    3. リモートの各FILEリソースについて保存パスを計画し、ローカルパスを指す `CustomizationConfig` を組み立てる（この段階ではI/Oを行わない）
    4. `ConfigSerializer.serialize()` で設定オブジェクトを生成し、アプリケーション層でYAML文字列化する
    5. `FileDownloader.download()` で各FILEの実体を取得し、`FileWriter.write()` で計画したパスへ書き込む（並行実行）
- **FILEリソースの保存パス規則**:
    - 保存ルートは `basePath/filePrefix/{platform}/{js|css}/{fileName}`（`platform` は `desktop` / `mobile`）
    - 設定ファイルへ書き出す `path` は `filePrefix` を含まない相対パス `{platform}/{js|css}/{fileName}`
- **ファイル名の衝突解決**:
    - ファイル名はリモートのファイル名の basename を採用し、サニタイズする（`< > : " | ? *` および制御文字を `_` に置換。`""` / `.` / `..` は `_` にする）
    - 同一プラットフォーム・カテゴリ内でファイル名が衝突する場合は、拡張子の前に連番を挿入して一意化する（例: `app.js` → `app_1.js`）
- **部分失敗時の方針**: ダウンロード途中で失敗しても書き込み済みファイルはディスク上に残るが、リトライは冪等（上書き）であり、設定YAMLの永続化は本処理の成功後に呼び出し側が行うため、設定とファイルの不整合は生じない
- **エラー**: ダウンロード失敗 → `SystemError(ExternalApiError)`、書き込み失敗 → `SystemError`（IO失敗）

### detectCustomizationDiff

ローカル設定ファイルとkintoneの現在の設定を比較し、差分を検出する。

- **入力**: `{ basePath: string }`
- **出力**: `CustomizationDiff`
- **処理フロー**:
    1. `CustomizationStorage.get()` と `CustomizationConfigurator.getCustomization()` を並行取得する
    2. 設定ファイルが存在しない場合は `ValidationError(InvalidInput)` をスローする
    3. ローカル設定テキストをパースする
    4. ローカル・リモート双方にFILEとして存在するペア（basenameで照合）を抽出し、`FileContentReader.read()` と `FileDownloader.download()` で内容を取得して比較、内容が異なるファイル名集合を作る
    5. `DiffDetector.detect()` にローカル設定・リモート設定・変更ファイル名集合を渡して差分を得る
- **エラー**:
    - 設定ファイル未存在 → `ValidationError(InvalidInput)`
    - パース失敗 → `BusinessRuleError` を `ValidationError` に変換
    - API/IO失敗 → `SystemError`

### saveCustomization

capture で生成した設定テキストを設定ファイルへ保存する。

- **入力**: `{ configText: string }`
- **出力**: `void`
- **処理フロー**: `CustomizationStorage.update()` で設定テキストを書き込む
- **エラー**: 書き込み失敗 → `SystemError`（IO失敗）
