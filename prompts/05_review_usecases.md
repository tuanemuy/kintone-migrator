# アプリケーション層のコードをレビューする

## 背景

- `spec/index.md` に設計を行っった
- `spec/domains/index.md` にドメインを定義した
- `spec/domains/${domain}.md` にドメインモデルの詳細を記載した
- `spec/usecases/${domain}.md` にユースケースを定義した
- `docs/backend_implementation_example.md` にコアアーキテクチャの実装例を記載した
- `app/core/application/` にアプリケーションサービスの実装を行った

## タスク

- 指定されたドメインについて、アプリケーション層の実装が適切か確認する
    - ドメインロジックをアプリケーションサービス内に実装していないか
    - その他DDDの原則に反していないか
- コードの品質をレビューし、 `logs/${yyyyMMddHHmm}_review_application_${domain}.md` に記録する

## 条件

- 現在の日時を取得してファイル名に反映する
- レイヤーごとに細かく調査する
- 無駄な情報を可能な限り省き、対応が必要な問題点のみ記載する
- ドキュメントの責任範囲を「アプリケーションサービスのコードレビュー」に限定する
