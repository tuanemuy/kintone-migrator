# 06: 通知設定管理

## 前提条件

- `field-acl` の実装パターンを踏襲する（`00-overview.md` 参照）
- 3種類の通知APIを1つのドメインで管理する

## 公式ドキュメント

- 条件通知の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-general-notification-settings/>
- 条件通知の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-general-notification-settings/>
- レコード条件通知の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-per-record-notification-settings/>
- レコード条件通知の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-per-record-notification-settings/>
- リマインダー通知の設定を取得する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/get-reminder-notification-settings/>
- リマインダー通知の設定を変更する: <https://cybozu.dev/ja/kintone/docs/rest-api/apps/settings/update-reminder-notification-settings/>

## APIレスポンス構造

### 条件通知（General）
```
GET /k/v1/app/notifications/general.json
→ { notifications: [{ entity, includeSubs, recordAdded, recordEdited, commentAdded, statusChanged, fileImported }], notifyToCommenter, revision }
```

### レコード条件通知（Per-Record）
```
GET /k/v1/app/notifications/perRecord.json
→ { notifications: [{ filterCond, title, targets: [{ entity, includeSubs }] }], revision }
```

### リマインダー通知（Reminder）
```
GET /k/v1/app/notifications/reminder.json
→ { notifications: [{ code, daysLater, hoursLater?, time?, filterCond, title, targets: [{ entity, includeSubs }] }], timezone, revision }
```

entity.type は共通で USER / GROUP / ORGANIZATION / FIELD_ENTITY

## YAMLスキーマ例

```yaml
general:
  notifyToCommenter: true
  notifications:
    - entity: { type: USER, code: admin }
      recordAdded: true
      recordEdited: true
      commentAdded: true
      statusChanged: true
      fileImported: false

perRecord:
  - filterCond: "ステータス in (\"完了\")"
    title: "タスクが完了しました"
    targets:
      - entity: { type: FIELD_ENTITY, code: 作成者 }

reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: 期限
      daysLater: -1
      time: "09:00"
      filterCond: "ステータス not in (\"完了\")"
      title: "期限が近づいています"
      targets:
        - entity: { type: FIELD_ENTITY, code: 担当者 }
```

## コマンド

| コマンド | 説明 |
|---|---|
| `notification capture` | 3種類の通知設定を1つのYAMLに出力 |
| `notification apply` | YAMLから通知設定を適用（デプロイ含む） |

## 作成するファイル

```
src/core/domain/notification/
  entity.ts, valueObject.ts, errorCode.ts
  ports/notificationConfigurator.ts, ports/notificationStorage.ts
  services/configParser.ts, services/configSerializer.ts, services/__tests__/

src/core/adapters/kintone/notificationConfigurator.ts
src/core/adapters/local/notificationStorage.ts

src/core/application/container/notification.ts
src/core/application/notification/
  captureNotification.ts, applyNotification.ts, parseConfig.ts, saveNotification.ts, __tests__/

src/cli/commands/notification/
  index.ts, capture.ts, apply.ts, __tests__/
```

## 実装上の注意

- 3種類のAPIを1つのconfigurator portにまとめる（`getGeneralNotifications()`, `getPerRecordNotifications()`, `getReminderNotifications()` 等）
- YAMLで `general` / `perRecord` / `reminder` のいずれかが省略された場合、その種類は変更しない
- デプロイが必要
