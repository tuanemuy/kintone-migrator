# FormSchema ユースケース

## detectDiff

### 概要

永続化されたスキーマと現在のフォーム設定を比較し、差分を検出する。シナリオ1（差分確認）、シナリオ2（マイグレーション）、シナリオ3（強制上書き）のいずれでも最初に実行されるユースケース。

### 入力DTO

なし

### 処理フロー

1. `SchemaStorage.get()` でスキーマテキストを取得する
2. `SchemaParser.parse()` でスキーマをパースする
3. `FormConfigurator.getFields()` と `FormConfigurator.getLayout()` を並行して実行し、現在のフィールド定義とレイアウトを取得する
4. `DiffDetector.detect()` でフィールドの差分を検出する
5. `DiffDetector.detectLayoutChanges()` でレイアウトの差分を検出する
6. 結果をDTOに変換して返す

### 出力DTO

```typescript
type DetectDiffOutput = {
  entries: readonly {
    type: "added" | "modified" | "deleted";
    fieldCode: string;
    fieldLabel: string;
    details: string;
    before?: {
      code: string;
      type: string;
      label: string;
      properties: Record<string, unknown>;
    };
    after?: {
      code: string;
      type: string;
      label: string;
      properties: Record<string, unknown>;
    };
  }[];
  schemaFields: readonly {
    fieldCode: string;
    fieldLabel: string;
    fieldType: string;
  }[];
  summary: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
  isEmpty: boolean;
  hasLayoutChanges: boolean;
};
```

### テストケース

- スキーマに存在し現在のフォームに存在しないフィールドがある場合、該当フィールドが `type: "added"` の差分エントリとして返される
- 両方に存在するがプロパティが異なるフィールドがある場合、該当フィールドが `type: "modified"` の差分エントリとして返される
- 現在のフォームに存在しスキーマに存在しないフィールドがある場合、該当フィールドが `type: "deleted"` の差分エントリとして返される
- スキーマと現在のフォーム設定が完全に一致し、レイアウトも一致する場合、`isEmpty` が `true` であり `entries` が空配列である
- フィールド差分がなくてもレイアウトに差分がある場合、`isEmpty` は `false` であり `hasLayoutChanges` が `true` である
- 差分エントリは追加 → 変更 → 削除の順にソートされている
- `summary` の各件数が `entries` 内の対応する `type` の件数と一致する
- `summary.total` が `summary.added + summary.modified + summary.deleted` と等しい
- `schemaFields` にスキーマ内の全フィールドのコード・ラベル・タイプが含まれる
- kintoneシステムフィールド（レコード番号、作成者など）は差分の検出対象に含まれない
- スキーマテキストが空の場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- スキーマテキストのフォーマットが不正な場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- スキーマテキストに重複するフィールドコードがある場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- `SchemaStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.getFields()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.getLayout()` の通信に失敗した場合、`SystemError` がスローされる

---

## executeMigration

### 概要

永続化されたスキーマと現在のフォーム設定を比較し、検出された差分のみを適用してフォーム設定を更新する。追加・変更・削除のそれぞれについて、対応するポートメソッドを呼び出す。レイアウトに差分がある場合はレイアウトも更新する。

### 処理フロー

1. `SchemaStorage.get()` でスキーマテキストを取得する
2. `SchemaParser.parse()` でスキーマをパースする
3. `FormConfigurator.getFields()` と `FormConfigurator.getLayout()` を並行して実行し、現在のフィールド定義とレイアウトを取得する
4. `DiffDetector.detect()` でフィールドの差分を検出する
5. `DiffDetector.detectLayoutChanges()` でレイアウトの差分を検出する
6. フィールド差分もレイアウト差分もない場合、何も実行せずに終了する
7. 差分に基づいてフィールドの追加 → 更新 → 削除の順でポートメソッドを呼び出す
8. レイアウトに差分がある場合、`FormConfigurator.updateLayout()` でレイアウトを更新する

### 入力DTO

なし

### 出力DTO

なし（`void`）

### テストケース

- フィールド差分もレイアウト差分もない場合、ポートの操作が一切呼ばれずに正常終了する
- 追加エントリのみがある場合、`FormConfigurator.addFields()` のみが呼ばれる
- 変更エントリのみがある場合、`FormConfigurator.updateFields()` のみが呼ばれる
- 削除エントリのみがある場合、`FormConfigurator.deleteFields()` のみが呼ばれる
- 追加・変更・削除が混在する場合、追加 → 更新 → 削除の順でそれぞれ対応するポートメソッドが呼ばれる
- `FormConfigurator.addFields()` に渡されるフィールドが、スキーマ内の追加対象フィールドのドメイン型と一致する
- `FormConfigurator.updateFields()` に渡されるフィールドが、スキーマ内の変更対象フィールドのドメイン型と一致する
- `FormConfigurator.deleteFields()` に渡されるフィールドコードが、現在のフォームにのみ存在するフィールドコードと一致する
- レイアウトに差分がある場合、`FormConfigurator.updateLayout()` がスキーマのレイアウトで呼ばれる
- フィールド差分がなくレイアウト差分のみがある場合、`FormConfigurator.updateLayout()` のみが呼ばれる
- スキーマテキストが空の場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- スキーマテキストのフォーマットが不正な場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- `SchemaStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.getFields()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.getLayout()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.addFields()` の通信に失敗した場合、失敗したフィールド情報を含む `SystemError` がスローされ、後続の更新・削除操作は実行されない
- `FormConfigurator.updateFields()` の通信に失敗した場合、失敗したフィールド情報を含む `SystemError` がスローされ、後続の削除操作は実行されない
- `FormConfigurator.deleteFields()` の通信に失敗した場合、失敗したフィールド情報を含む `SystemError` がスローされる

---

## forceOverrideForm

### 概要

スキーマでフォーム設定を完全に上書きする。永続化されたスキーマを取得し、現在のフォーム設定と比較した上で、スキーマにないフィールドは削除、スキーマにあるフィールドは追加または上書きする。差分の有無にかかわらず、スキーマに含まれる既存フィールドはすべて上書きされる。フィールドの操作後、スキーマのレイアウトで常にレイアウトを更新する。

### 処理フロー

1. `SchemaStorage.get()` でスキーマテキストを取得する
2. `SchemaParser.parse()` でスキーマをパースする
3. `FormConfigurator.getFields()` で現在のフィールド定義を取得する
4. スキーマと現在のフォームを比較し、追加・更新・削除対象のフィールドを分類する
5. 追加対象がある場合、`FormConfigurator.addFields()` でフィールドを追加する
6. 更新対象がある場合、`FormConfigurator.updateFields()` でフィールドを上書きする
7. 削除対象がある場合、`FormConfigurator.deleteFields()` でフィールドを削除する
8. `FormConfigurator.updateLayout()` でスキーマのレイアウトに更新する（常に実行）

### 入力DTO

なし

### 出力DTO

なし（`void`）

### テストケース

- スキーマにないフィールドが `FormConfigurator.deleteFields()` で削除される
- スキーマにあり現在のフォームにないフィールドが `FormConfigurator.addFields()` で追加される
- 両方に存在するフィールドは設定値の差分有無にかかわらず `FormConfigurator.updateFields()` で上書きされる
- 追加・更新・削除が必要な場合、追加 → 更新 → 削除の順でポートメソッドが呼ばれる
- スキーマと現在のフォーム設定が完全に一致する場合でも、全フィールドの `FormConfigurator.updateFields()` が実行される
- フィールド操作の後に `FormConfigurator.updateLayout()` がスキーマのレイアウトで呼ばれる
- スキーマにフィールドが0件で現在のフォームにのみフィールドが存在する場合、削除後に `FormConfigurator.updateLayout()` が実行される
- スキーマテキストが空の場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- スキーマテキストのフォーマットが不正な場合、`SchemaParser.parse()` の `BusinessRuleError` を `ValidationError` に変換してスローする
- `SchemaStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.getFields()` の通信に失敗した場合、`SystemError` がスローされる
- `FormConfigurator.addFields()` の通信に失敗した場合、`SystemError` がスローされ、後続の更新・削除操作は実行されない
- `FormConfigurator.updateFields()` の通信に失敗した場合、`SystemError` がスローされ、後続の削除操作は実行されない
- `FormConfigurator.deleteFields()` の通信に失敗した場合、`SystemError` がスローされる

---

## captureSchema

### 概要

現在のフォーム設定をスキーマテキストに変換し、既存のスキーマが存在するかどうかを確認する。初回導入時や手動で変更した設定をスキーマ管理に取り込む際に使用する。

### 入力DTO

なし

### 出力DTO

```typescript
type CaptureSchemaOutput = {
  schemaText: string;
  hasExistingSchema: boolean;
};
```

### テストケース

- 現在のフォームフィールドがスキーマテキストに変換されて `schemaText` に格納される
- 既存のスキーマが存在する場合、`hasExistingSchema` が `true` である
- 既存のスキーマが存在しない場合、`hasExistingSchema` が `false` である
- 生成される `schemaText` が `SchemaParser.parse()` で再パース可能である（ラウンドトリップ整合性）
- kintoneシステムフィールドは `schemaText` に含まれない
- `FormConfigurator.getLayout()` の通信に失敗した場合、`SystemError` がスローされる
- `SchemaStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## saveSchema

### 概要

生成されたスキーマテキストを永続化する。`captureSchema` で生成されたテキストの保存に使用される。

### 入力DTO

```typescript
type SaveSchemaInput = {
  schemaText: string;
};
```

### 出力DTO

なし（`void`）

### テストケース

- 指定された `schemaText` が `SchemaStorage.update()` に渡されてスキーマが永続化される
- `SchemaStorage.update()` の通信に失敗した場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

上記ユースケースはCLIからも実行可能。CLIでは以下の差異がある：

- `SchemaStorage` → `LocalFileSchemaStorage`（ローカルYAMLファイル）
- `KintoneRestAPIClient` → ユーザー名/パスワード認証で明示的に初期化
- アプリID → `KINTONE_APP_ID` 環境変数から取得
- `capture` コマンドは `captureSchema` + `saveSchema` を連続実行
