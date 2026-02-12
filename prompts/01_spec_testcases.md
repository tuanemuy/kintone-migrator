# テストケースを定義する

## 背景

- `spec/index.md` に設計を行っている
- `docs/backend_implementation_example.md` にコアアーキテクチャの実装例を記載した

## タスク

- すべてのユースケースについて、TSV形式でテストケースを定義する

## 条件

- 対象ファイルは `spec/testcases/${domain}/${usecase}.tsv`
- カラム構成は以下の通り
    - テスト内容
        - 振る舞いを簡潔に記載する
    - 実装ステータス
- 必要なテストを網羅する
