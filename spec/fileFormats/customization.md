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
- `desktop` は必須
- `mobile` は省略可能（デフォルト: `{ js: [], css: [] }`）
- 各プラットフォームの `js` と `css` は配列（空配列も可）
- FILEリソースは `type: FILE` と `path` を持つ
- URLリソースは `type: URL` と `url` を持つ
