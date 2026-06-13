# 通知設定ファイル仕様

通知設定の設定ファイルフォーマット。一般通知、レコード条件通知、リマインダー通知の3種類を定義する。

## kintone API リファレンス

- [アプリの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-notification-settings/)
- [レコードの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-per-record-notification-settings/)
- [リマインダーの条件通知の設定を取得する](https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-reminder-notification-settings/)

## フォーマット

YAML形式で記述する。

```yaml
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin_user
      recordAdded: true
      recordEdited: true
      commentAdded: true
      statusChanged: true
      fileImported: false
    - entity:
        type: GROUP
        code: managers
      includeSubs: true
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: true
      fileImported: false
perRecord:
  - filterCond: priority in ("high")
    title: 高優先度レコードの更新
    targets:
      - entity:
          type: USER
          code: manager
      - entity:
          type: ORGANIZATION
          code: sales_dept
        includeSubs: true
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: deadline
      daysLater: 3
      time: "09:00"
      filterCond: status not in ("完了")
      title: 締切日リマインダー
      targets:
        - entity:
            type: FIELD_ENTITY
            code: creator
```

## フィールド定義

トップレベルは3種類の通知設定からなる。各キーは任意で、記述されたものだけが対象となる。

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `general` | GeneralNotification | 任意 | アプリの一般（条件）通知 |
| `perRecord` | PerRecordNotification[] | 任意 | レコードの条件通知 |
| `reminder` | ReminderNotification | 任意 | リマインダー通知 |

**`general`**（GeneralNotification）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `notifyToCommenter` | boolean | 任意 | コメント投稿者へ通知するか |
| `notifications` | GeneralNotificationTarget[] | 必須 | 通知先と通知条件の配列 |

**`general.notifications[]`**（GeneralNotificationTarget）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `entity.type` | `"USER"` \| `"GROUP"` \| `"ORGANIZATION"` \| `"FIELD_ENTITY"` | 必須 | 通知先エンティティの種別 |
| `entity.code` | string | 必須 | エンティティのコード（空文字不可） |
| `includeSubs` | boolean | 任意 | サブ組織・サブグループを含めるか |
| `recordAdded` / `recordEdited` / `commentAdded` / `statusChanged` / `fileImported` | boolean | 任意 | 各イベントで通知するか |

**`perRecord[]`**（PerRecordNotification）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `filterCond` | string | 任意 | 通知対象レコードの絞り込み条件 |
| `title` | string | 任意 | 通知のタイトル |
| `targets` | NotificationTarget[] | 必須 | 通知先（`entity` / `includeSubs`）の配列 |

**`reminder`**（ReminderNotification）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `timezone` | string | 任意 | リマインダーのタイムゾーン |
| `notifications` | ReminderNotificationEntry[] | 必須 | リマインダー定義の配列 |

**`reminder.notifications[]`**（ReminderNotificationEntry）:

| プロパティ | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `code` | string | 任意 | リマインダーを識別するコード |
| `daysLater` | number | 必須 | 基準日からの日数（後述の値域参照） |
| `hoursLater` | number | 任意 | 追加時間（`time` と排他） |
| `time` | string | 任意 | 通知時刻 `"HH:MM"`（`hoursLater` と排他） |
| `filterCond` | string | 任意 | 対象レコードの絞り込み条件 |
| `title` | string | 任意 | 通知のタイトル |
| `targets` | NotificationTarget[] | 必須 | 通知先（`entity` / `includeSubs`）の配列 |

## フィールドの値域・制約

- `general.notifications[].entity` / `perRecord[].targets[].entity` / `reminder.notifications[].targets[].entity`
    - `type`: `USER` / `GROUP` / `ORGANIZATION` / `FIELD_ENTITY`（`FIELD_ENTITY` はフォーム上のユーザー選択フィールド。例: 作成者・担当者）
    - `code`: 空文字不可
- `includeSubs`: サブ組織・サブグループを含めるか（真偽値、オプション）。`GROUP` / `ORGANIZATION` で意味を持つ
- `reminder.notifications[]`
    - `daysLater`: 基準日時からの相対日数。**−10,000〜10,000 の整数**（負値は「基準日時より前」を表す正当な値、例: `-3`）。範囲外・非整数はエラー。必須
    - `hoursLater`: 追加時間（**−10,000〜10,000 の整数**、負値は基準日時より前、オプション）。`time` と同時に指定できない
    - `time`: 通知時刻（`"HH:MM"`、オプション）。`hoursLater` と同時に指定できない

## バリデーション

パース時に以下を検証する。詳細は [Notification ドメイン仕様](../domains/notification.md) を参照。

| エラーコード | 条件 |
| --- | --- |
| `NT_INVALID_CONFIG_STRUCTURE` | ルート構造が不正（`general` / `perRecord` / `reminder` の型不一致 等） |
| `NT_INVALID_ENTITY_TYPE` | `entity.type` が許容値以外 |
| `NT_EMPTY_ENTITY_CODE` | `entity.code` が空文字 |
| `NT_MISSING_REQUIRED_FIELD` | 必須フィールド（`notifications` / `targets` 等）の欠落 |
| `NT_CONFLICTING_TIMING_FIELDS` | `hoursLater` と `time` を同時指定している |
| `NT_INVALID_HOURS_LATER` | `hoursLater` が −10,000〜10,000 の整数でない |
| `NT_INVALID_DAYS_LATER` | `daysLater` が −10,000〜10,000 の整数でない |

## エラーコード

| 定数 | コード |
| --- | --- |
| `NtInvalidConfigStructure` | `NT_INVALID_CONFIG_STRUCTURE` |
| `NtInvalidEntityType` | `NT_INVALID_ENTITY_TYPE` |
| `NtEmptyEntityCode` | `NT_EMPTY_ENTITY_CODE` |
| `NtMissingRequiredField` | `NT_MISSING_REQUIRED_FIELD` |
| `NtConflictingTimingFields` | `NT_CONFLICTING_TIMING_FIELDS` |
| `NtInvalidHoursLater` | `NT_INVALID_HOURS_LATER` |
| `NtInvalidDaysLater` | `NT_INVALID_DAYS_LATER` |
