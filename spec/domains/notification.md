# Notification

## ドメイン名

Notification

## ユビキタス言語

| 用語 | 英語名 | 説明 |
| --- | --- | --- |
| 通知設定 | NotificationConfig | 通知の望ましい状態を定義した設定 |
| 一般通知 | GeneralNotificationConfig | アプリ全体の通知設定 |
| レコード条件通知 | PerRecordNotification | 条件に合致するレコードに対する通知設定 |
| リマインダー通知 | ReminderNotificationConfig | リマインダー通知の設定 |
| 通知先 | NotificationTarget | レコード条件通知・リマインダー通知の通知先 |

## エンティティ

### GeneralNotification

一般通知の個別設定。

```typescript
type GeneralNotification = Readonly<{
  entity: NotificationEntity;
  includeSubs?: boolean;
  recordAdded: boolean;
  recordEdited: boolean;
  commentAdded: boolean;
  statusChanged: boolean;
  fileImported: boolean;
}>;
```

### GeneralNotificationConfig

一般通知の全体設定。

```typescript
type GeneralNotificationConfig = Readonly<{
  notifyToCommenter: boolean;
  notifications: readonly GeneralNotification[];
}>;
```

### PerRecordNotification

レコード条件通知の設定。

```typescript
type PerRecordNotification = Readonly<{
  filterCond: string;
  title: string;
  targets: readonly NotificationTarget[];
}>;
```

### ReminderNotification

リマインダー通知の設定。

```typescript
type ReminderNotification = Readonly<{
  code: string;
  daysLater: number;
  hoursLater?: number;
  time?: string;
  filterCond: string;
  title: string;
  targets: readonly NotificationTarget[];
}>;
```

- `code` は基準となる日付フィールドコード
- `daysLater` は基準日時からの相対日数。必須で、**−10,000〜10,000 の整数**を許容する。**負の整数は「基準日時より前」を表す正当な値**（例: 締切の3日前リマインダー = `-3`）。値が `number` でない場合は `BusinessRuleError(NT_MISSING_REQUIRED_FIELD)`、範囲外・非整数の場合は `BusinessRuleError(NT_INVALID_DAYS_LATER)` をスローする
- `hoursLater` は追加時間（オプション）。指定する場合は同様に **−10,000〜10,000 の整数**（負値は基準日時より前）を許容する。範囲外・非整数の場合は `BusinessRuleError(NT_INVALID_HOURS_LATER)` をスローする
- `time` は通知時刻（オプション）
- `hoursLater` と `time` は同時に指定できない。両方指定された場合は `BusinessRuleError(NT_CONFLICTING_TIMING_FIELDS)` をスローする

> ⚠️ **実装フォローアップ**: 現状の実装 `src/core/domain/notification/services/configParser.ts` は `daysLater`/`hoursLater` を**非負整数のみ許可**し、負値を `NT_INVALID_DAYS_LATER`/`NT_INVALID_HOURS_LATER` で拒否している。これは kintone REST API（[update-reminder-notification-settings](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-reminder-notification-settings/)）が許容する正当な設定（−10,000〜10,000、負値=基準日時より前）を弾く**実装バグ**であり、本仕様（負値許容・範囲チェック）に合わせて修正が必要。

### ReminderNotificationConfig

リマインダー通知の全体設定。

```typescript
type ReminderNotificationConfig = Readonly<{
  timezone: string;
  notifications: readonly ReminderNotification[];
}>;
```

### NotificationConfig

通知設定の全体。3種類の通知を包括する。

```typescript
type NotificationConfig = Readonly<{
  general?: GeneralNotificationConfig;
  perRecord?: readonly PerRecordNotification[];
  reminder?: ReminderNotificationConfig;
}>;
```

## 値オブジェクト

### NotificationEntityType

通知対象の種別。

```typescript
type NotificationEntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";
```

### NotificationEntity

通知対象の識別情報。

```typescript
type NotificationEntity = Readonly<{
  type: NotificationEntityType;
  code: string;
}>;
```

- `code` は空文字であってはならない。空の場合は `BusinessRuleError(NT_EMPTY_ENTITY_CODE)` をスローする

### NotificationTarget

レコード条件通知（`PerRecordNotification`）・リマインダー通知（`ReminderNotification`）の通知先。両者で共通の型を用いる。

```typescript
type NotificationTarget = Readonly<{
  entity: NotificationEntity;
  includeSubs?: boolean;
}>;
```

- `entity` は通知先の識別情報
- `includeSubs` はサブ組織・サブグループを含めるかどうか（オプション）。主に `ORGANIZATION` / `GROUP` で意味を持つ。省略時は `undefined` のまま保持する（デフォルト補完しない）

## ポート

### NotificationConfigurator

kintoneアプリの通知設定（一般通知・レコード条件通知・リマインダー通知）を取得・更新するためのインターフェース。3種類の通知はそれぞれ独立したAPIで取得・更新する。

```typescript
interface NotificationConfigurator {
  getGeneralNotifications(): Promise<{
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision: string;
  }>;
  updateGeneralNotifications(params: {
    notifyToCommenter: boolean;
    notifications: readonly GeneralNotification[];
    revision?: string;
  }): Promise<{ revision: string }>;

  getPerRecordNotifications(): Promise<{
    notifications: readonly PerRecordNotification[];
    revision: string;
  }>;
  updatePerRecordNotifications(params: {
    notifications: readonly PerRecordNotification[];
    revision?: string;
  }): Promise<{ revision: string }>;

  getReminderNotifications(): Promise<{
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision: string;
  }>;
  updateReminderNotifications(params: {
    timezone: string;
    notifications: readonly ReminderNotification[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
```

- `getGeneralNotifications()` / `getPerRecordNotifications()` / `getReminderNotifications()` は現在の通知設定をドメイン型に変換し、楽観ロック用の `revision` とともに返す
- `updateGeneralNotifications()` / `updatePerRecordNotifications()` / `updateReminderNotifications()` は対応する通知設定を更新する。`revision` を渡すと楽観的同時実行制御を行い、省略すると強制書き込みになる。更新後の `revision` を返す
- API通信に失敗した場合は `SystemError` をスローする

### NotificationStorage

通知設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[通知設定ファイル仕様](../fileFormats/notification.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `notification apply` | YAML設定ファイルから通知設定を適用する |
| `notification capture` | 現在の通知設定をYAMLファイルに保存する |
| `notification diff` | ローカルの通知設定とリモートの差分を表示する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--notification-file` | `NOTIFICATION_FILE_PATH` | 通知設定ファイルパス（デフォルト: `notification.yaml`、マルチアプリ: `notification/<appName>.yaml`） |
