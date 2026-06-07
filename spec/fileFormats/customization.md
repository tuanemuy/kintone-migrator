# カスタマイズ設定ファイル仕様

JS/CSSカスタマイズの設定ファイルフォーマット。

## kintone API リファレンス

- [JavaScript / CSSによるカスタマイズの設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-customization/)
- [JavaScript / CSSによるカスタマイズの設定を変更する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-customization/)

## フォーマット

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
- `desktop` は省略可能（デフォルト: `{ js: [], css: [] }`）
- `mobile` は省略可能（デフォルト: `{ js: [], css: [] }`）
- 各プラットフォームの `js` と `css` は配列（空配列も可。省略時は空配列）
- FILEリソースは `type: FILE` と `path`（非空）を持つ
- URLリソースは `type: URL` と `url`（非空）を持つ

## フィールド定義

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `scope` | `"ALL"` \| `"ADMIN"` \| `"NONE"` | 任意 | カスタマイズの適用範囲。省略時は scope を変更しない |
| `desktop` | PlatformResources | 任意 | PC 版のカスタマイズ。省略時は `{ js: [], css: [] }` |
| `mobile` | PlatformResources | 任意 | モバイル版のカスタマイズ。省略時は `{ js: [], css: [] }` |

**PlatformResources**（`desktop.*` / `mobile.*`）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `js` | Resource[] | 任意 | JavaScript リソースの配列。省略時は空配列 |
| `css` | Resource[] | 任意 | CSS リソースの配列。省略時は空配列 |

**Resource**（`desktop.js[]` 等の各要素）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `type` | `"FILE"` \| `"URL"` | 必須 | リソースの種別 |
| `path` | string | 任意 | FILE リソースのローカルパス（`type: FILE` のとき必須・非空） |
| `url` | string | 任意 | URL リソースの URL（`type: URL` のとき必須・非空） |

## capture 出力フォーマット

`schema capture`（capture系コマンド）はkintoneの現在のカスタマイズ設定を取得し、上記フォーマットのYAMLを生成する。生成時の規則は以下のとおり。

- `scope` は常に出力される（リモートのscopeは常に確定値のため）
- プラットフォーム（`desktop` / `mobile`）は `js` / `css` のいずれかにリソースがある場合のみ出力される。両方空の場合はそのプラットフォームのキー自体が省略される
- プラットフォーム内でも、空の `js` / `css` 配列はキーが省略される
- FILEリソースの実体はローカルへダウンロードされ、`path` には `{platform}/{js|css}/{fileName}` 形式の相対パスが書き出される（`platform` は `desktop` / `mobile`）
    - `fileName` はリモートのファイル名の basename をサニタイズしたもの（`< > : " | ? *` と制御文字を `_` に置換）
    - 同一プラットフォーム・カテゴリ内でファイル名が衝突する場合は、拡張子の前に連番を挿入して一意化する（例: `app.js` → `app_1.js`）
- URLリソースは `path` を持たず `url` がそのまま書き出される

詳細な保存パス規則・衝突解決は [Customization ドメイン仕様](../domains/customization.md) の `captureCustomization` を参照。

## バリデーション

パース時に以下を検証する。詳細は [Customization ドメイン仕様](../domains/customization.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `CZ_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（オブジェクトでない、`desktop` / `mobile` が不正 等） |
| `CZ_INVALID_SCOPE` | `scope` が `ALL` / `ADMIN` / `NONE` 以外 |
| `CZ_INVALID_RESOURCE_TYPE` | リソースの `type` が `FILE` / `URL` 以外、または必須の `path` / `url` 欠落・空 |
| `CZ_TOO_MANY_FILES` | kintone のファイル数上限を超過 |

## エラーコード

| 定数 | コード |
| --- | --- |
| `CzInvalidConfigStructure` | `CZ_INVALID_CONFIG_STRUCTURE` |
| `CzInvalidScope` | `CZ_INVALID_SCOPE` |
| `CzInvalidResourceType` | `CZ_INVALID_RESOURCE_TYPE` |
| `CzTooManyFiles` | `CZ_TOO_MANY_FILES` |

## ラウンドトリップ整合性

`ConfigParser`（パース）と `ConfigSerializer`（直列化）はラウンドトリップで整合する。

- **serialize → parse**: capture が生成したYAMLは `ConfigParser.parse()` で再度パース可能であり、scope・各リソースの type / path / url が保持される
- **空配列・省略の正規化**: parse は省略された `scope` を「変更しない」意図として保持し、省略された `desktop` / `mobile` / `js` / `css` を空として扱う。serialize は空のプラットフォーム・空配列を省略するため、`{ js: [], css: [] }` のような空構造は capture 出力には現れない。この正規化により、空状態の表現は一意になる
- **apply → capture の往復**: apply でアップロードしたFILEリソースは、capture 時に同名でダウンロードされ `path` として復元される。ただしローカルの `path`（例: `./dist/desktop.js`）は capture 後には `{platform}/{js|css}/{fileName}`（kintone上のファイル名ベース）へ正規化されるため、ファイルの配置パスは往復で一致しない場合がある。リソースの種別・順序・scope は保持される
- **URLリソース**: URLはそのまま保持され、往復で完全に一致する
