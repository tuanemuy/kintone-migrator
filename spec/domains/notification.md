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
  targets: readonly PerRecordNotificationTarget[];
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
  targets: readonly ReminderNotificationTarget[];
}>;
```

- `code` は基準となる日付フィールドコード
- `daysLater` は基準日からの日数
- `hoursLater` は追加時間（オプション）
- `time` は通知時刻（オプション）

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

## ポート

### NotificationConfigurator

kintoneアプリの通知設定を取得・更新するためのインターフェース。

### NotificationStorage

通知設定テキストを永続化・取得するためのインターフェース。

## 設定ファイルのフォーマット

[通知設定ファイル仕様](../fileFormats/notification.md) を参照。

## CLI

| コマンド | 説明 |
| --- | --- |
| `notification apply` | YAML設定ファイルから通知設定を適用する |
| `notification capture` | 現在の通知設定をYAMLファイルに保存する |

| オプション | 環境変数 | 説明 |
| --- | --- | --- |
| `--notification-file` | `NOTIFICATION_FILE_PATH` | 通知設定ファイルパス（デフォルト: `notification.yaml`、マルチアプリ: `notification/<appName>.yaml`） |
