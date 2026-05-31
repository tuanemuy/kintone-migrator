# Notification ユースケース

## applyNotification

### 概要

ローカルの設定ファイル（notification.yaml）に定義された通知設定をkintoneアプリに適用する。通知設定は一般通知（general）・レコード条件通知（perRecord）・リマインダー通知（reminder）の3種類を包括し、設定ファイルに記述されたセクションのみが更新される（各セクションは独立した API 呼び出しで更新する）。各セクション内では全置換方式で適用する。

設計上の注意: 各セクションは別々の API 呼び出しで更新されるため、あるセクションの更新が成功した後で別のセクションの更新が失敗すると、アプリは部分的に更新された状態になる。kintone API には通知種別をまたぐトランザクション更新が存在しないための制約である。コマンドの再実行は冪等であり安全。

### 入力DTO

なし

### 処理フロー

1. `NotificationStorage.get()` で設定テキストを取得する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `NotificationConfigParser.parse()` で通知設定をパースする
4. `general` セクションが記述されている場合、`getGeneralNotifications()` で現在のrevisionを取得し、`updateGeneralNotifications()` で更新する
5. `perRecord` セクションが記述されている場合、`getPerRecordNotifications()` で現在のrevisionを取得し、`updatePerRecordNotifications()` で更新する
6. `reminder` セクションが記述されている場合、`getReminderNotifications()` で現在のrevisionを取得し、`updateReminderNotifications()` で更新する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定ファイルから通知設定を読み込み、記述された各セクションをkintoneアプリに適用する
- 各セクションの更新時に、そのセクションの現在のrevisionが更新リクエストに渡される
- `general` のみ記述されている場合、`perRecord`/`reminder` の更新 API は呼ばれない
- 全セクションが記述されている場合、3つの更新 API がそれぞれ呼ばれる

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- リマインダーの `daysLater` が範囲外（−10,000〜10,000 の整数でない）・非整数の場合、`ValidationError`（ドメインの `BusinessRuleError(NT_INVALID_DAYS_LATER)` をラップ）がスローされる。負の整数は「基準日時より前」を表す正当な値であり、エラーにならない
- リマインダーで `hoursLater` と `time` が同時に指定された場合、`ValidationError`（`BusinessRuleError(NT_CONFLICTING_TIMING_FIELDS)` をラップ）がスローされる
- 通知対象の `code` が空文字の場合、`ValidationError`（`BusinessRuleError(NT_EMPTY_ENTITY_CODE)` をラップ）がスローされる
- `NotificationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- いずれかのセクションの取得・更新 API 通信に失敗した場合、`SystemError` がスローされる（先行セクションは適用済みになりうる）

---

## captureNotification

### 概要

kintoneアプリから現在の通知設定（一般通知・レコード条件通知・リマインダー通知の3種類）を取得し、YAML形式でシリアライズしてファイルに保存できる状態にする。

### 入力DTO

なし

### 処理フロー

1. `getGeneralNotifications()`・`getPerRecordNotifications()`・`getReminderNotifications()` を並行して実行し、3種類の通知設定を取得する
2. 取得結果を `NotificationConfig`（general/perRecord/reminder）に組み立てる
3. `NotificationConfigSerializer.serialize()` でシリアライズ可能なオブジェクトに変換し、ConfigCodec でYAML文字列にする
4. `NotificationStorage.get()` で既存ファイルの有無を確認する
5. 結果を返す

### 出力DTO

```typescript
type CaptureNotificationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};
```

### テストケース

#### 正常系

- kintoneアプリから3種類の通知設定を取得し、`NotificationConfig` に組み立ててYAML文字列にシリアライズする
- 既存ファイルがある場合、`hasExistingConfig` が `true` になる
- 既存ファイルがない場合、`hasExistingConfig` が `false` になる

#### 異常系

- いずれかの通知設定取得 API 通信に失敗した場合、`SystemError` がスローされる
- `NotificationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる

---

## detectNotificationDiff

### 概要

永続化された通知設定とリモートの現在の設定を比較し、差分を検出する。apply 実行前のプレビューや、`notification diff` コマンドで利用される。kintone API は3セクションを常に返す（空配列・デフォルト値を含む）ため、リモート設定は `NotificationConfig` の形に揃えてからセクション単位で比較する。

### 入力DTO

なし

### 処理フロー

1. `NotificationStorage.get()`・`getGeneralNotifications()`・`getPerRecordNotifications()`・`getReminderNotifications()` を並行して実行する
2. ファイルが存在しない（`exists` が `false`）場合、`ValidationError` をスローする
3. `NotificationConfigParser.parse()` でローカル設定をパースする
4. リモートの3セクションの取得結果を `NotificationConfig` に組み立てる
5. `NotificationDiffDetector.detect()` でローカルとリモートの差分を検出する
6. `NotificationDiff` を返す

### 出力DTO

```typescript
type NotificationDiffEntry = {
  readonly type: "added" | "modified" | "deleted";
  readonly section: "general" | "perRecord" | "reminder";
  readonly name: string;
  readonly details: string;
};

type NotificationDiff = {
  readonly entries: readonly NotificationDiffEntry[];
  readonly summary: {
    readonly added: number;
    readonly modified: number;
    readonly deleted: number;
    readonly total: number;
  };
  readonly isEmpty: boolean;
  readonly warnings: readonly string[];
};
```

### テストケース

#### 正常系

- ローカルとリモートに差分がない場合、`isEmpty` が `true` になる
- 各セクション（general/perRecord/reminder）の通知の追加/変更/削除が `section` 付きで `entries` に分類される
- `summary` に追加/変更/削除の件数と合計が集計される

#### 異常系

- 設定ファイルが存在しない場合、`ValidationError` がスローされる
- 設定テキストのYAMLフォーマットが不正な場合、`ValidationError` がスローされる
- `NotificationStorage.get()` の通信に失敗した場合、`SystemError` がスローされる
- いずれかの通知設定取得 API 通信に失敗した場合、`SystemError` がスローされる

---

## saveNotification

### 概要

通知設定テキストをストレージに保存する。

### 入力DTO

```typescript
type SaveNotificationInput = {
  readonly configText: string;
};
```

### 処理フロー

1. `NotificationStorage.update()` で設定テキストを保存する

### 出力DTO

なし（`void`）

### テストケース

#### 正常系

- 設定テキストをストレージに保存する

#### 異常系

- `NotificationStorage.update()` のファイル操作に失敗した場合、`SystemError` がスローされる

---

## CLI実行コンテキスト

### notification applyコマンド

`detectNotificationDiff` → `applyNotification` ユースケースをCLIから実行する。

- `NotificationStorage` → ローカルYAMLファイルアダプター
- `NotificationConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--notification-file` / `NOTIFICATION_FILE_PATH` から取得（デフォルト: `notification.yaml`、マルチアプリ: `notification/<appName>.yaml`）
- 適用前に `detectNotificationDiff` で差分プレビューを表示し、差分がなければ何もしない。差分がある場合は確認プロンプト（`--yes` でスキップ可）の後に適用する
- 適用後、`confirmAndDeploy` で運用環境への反映（デプロイ）を確認する

### notification captureコマンド

`captureNotification` + `saveNotification` ユースケースをCLIから実行する。

- `NotificationStorage` → ローカルYAMLファイルアダプター
- `NotificationConfigurator` → kintone REST APIアダプター
- 設定ファイルパス → `--notification-file` / `NOTIFICATION_FILE_PATH` から取得（デフォルト: `notification.yaml`、マルチアプリ: `notification/<appName>.yaml`）
- 既存ファイルがある場合、上書き警告を表示する

### notification diffコマンド

`detectNotificationDiff` ユースケースをCLIから実行し、ローカルとリモートの差分を表示する。
