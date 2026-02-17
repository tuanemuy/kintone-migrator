# kintone-migrator

A CLI tool for declaratively managing kintone app configurations as code -- form schemas, views, access permissions, process management, notifications, and more.

## Quick Start

```bash
# Install
npm install -g kintone-migrator

# Set up environment
export KINTONE_DOMAIN=example.cybozu.com
export KINTONE_USERNAME=your_username
export KINTONE_PASSWORD=your_password
export KINTONE_APP_ID=123

# Capture current form schema
kintone-migrator schema capture -f schema.yaml

# Edit schema.yaml, then check diff
kintone-migrator schema diff

# Apply changes
kintone-migrator schema migrate
```

Requires Node.js 22 or later.

## Configuration

### Authentication

Two methods are supported (API Token takes priority if both are set):

- **API Token** (`KINTONE_API_TOKEN`): Recommended. Multiple tokens can be comma-separated (e.g., `token1,token2`).
- **Username/Password** (`KINTONE_USERNAME` / `KINTONE_PASSWORD`): Basic authentication.

### Connection Options

| CLI Argument | Environment Variable | Description |
|---|---|---|
| `--domain`, `-d` | `KINTONE_DOMAIN` | kintone domain (e.g., `example.cybozu.com`) |
| `--api-token`, `-t` | `KINTONE_API_TOKEN` | API token |
| `--username`, `-u` | `KINTONE_USERNAME` | Username |
| `--password`, `-p` | `KINTONE_PASSWORD` | Password |
| `--app-id`, `-a` | `KINTONE_APP_ID` | App ID |
| `--guest-space-id`, `-g` | `KINTONE_GUEST_SPACE_ID` | Guest space ID |
| `--schema-file`, `-f` | `SCHEMA_FILE_PATH` | Schema file path (default: `schema.yaml`) |

CLI arguments take precedence over environment variables.

### .env File

Environment variables can be defined in a `.env` file and loaded with `dotenv-cli` or similar tools.

```env
KINTONE_DOMAIN=example.cybozu.com
KINTONE_USERNAME=your_username
KINTONE_PASSWORD=your_password
KINTONE_APP_ID=123
SCHEMA_FILE_PATH=schema.yaml
```

### Multi-App Project Config

For managing multiple apps, create a project config file (`kintone-migrator.yaml`). You can generate one automatically with `kintone-migrator init`.

```yaml
domain: example.cybozu.com
auth:
  apiToken: "shared-token"

apps:
  customer:
    appId: "10"
    files:
      schema: schemas/customer.yaml
      seed: seeds/customer.yaml
      view: view/customer.yaml
      settings: settings/customer.yaml
      notification: notification/customer.yaml
      report: report/customer.yaml
      action: action/customer.yaml
      process: process/customer.yaml
      fieldAcl: field-acl/customer.yaml
      appAcl: app-acl/customer.yaml
      recordAcl: record-acl/customer.yaml
      adminNotes: admin-notes/customer.yaml
      plugin: plugin/customer.yaml
  order:
    appId: "20"
    files:
      schema: schemas/order.yaml
      seed: seeds/order.yaml
      view: view/order.yaml
      settings: settings/order.yaml
      notification: notification/order.yaml
      report: report/order.yaml
      action: action/order.yaml
      process: process/order.yaml
      fieldAcl: field-acl/order.yaml
      appAcl: app-acl/order.yaml
      recordAcl: record-acl/order.yaml
      adminNotes: admin-notes/order.yaml
      plugin: plugin/order.yaml
    dependsOn:
      - customer
```

| Field | Required | Description |
|---|---|---|
| `appId` | Yes | kintone app ID |
| `files.schema` | No | Schema file path (default: `schemas/<appName>.yaml`) |
| `files.seed` | No | Seed file path (default: `seeds/<appName>.yaml`) |
| `files.customize` | No | Customization file path (default: `customize/<appName>.yaml`) |
| `files.fieldAcl` | No | Field ACL file path (default: `field-acl/<appName>.yaml`) |
| `files.view` | No | View file path (default: `view/<appName>.yaml`) |
| `files.appAcl` | No | App ACL file path (default: `app-acl/<appName>.yaml`) |
| `files.recordAcl` | No | Record ACL file path (default: `record-acl/<appName>.yaml`) |
| `files.process` | No | Process management file path (default: `process/<appName>.yaml`) |
| `files.settings` | No | General settings file path (default: `settings/<appName>.yaml`) |
| `files.notification` | No | Notification file path (default: `notification/<appName>.yaml`) |
| `files.report` | No | Report file path (default: `report/<appName>.yaml`) |
| `files.action` | No | Action file path (default: `action/<appName>.yaml`) |
| `files.adminNotes` | No | Admin notes file path (default: `admin-notes/<appName>.yaml`) |
| `files.plugin` | No | Plugin file path (default: `plugin/<appName>.yaml`) |

> **Note:** Flat field format (`schemaFile`, `seedFile`, etc.) is deprecated. Use the `files` object instead. Flat fields are still supported for backward compatibility but may be removed in a future version.
| `domain` | No | Override top-level domain |
| `auth` | No | Override top-level authentication |
| `guestSpaceId` | No | Guest space ID |
| `dependsOn` | No | List of app names this app depends on |

Multi-app CLI options (available on all commands):

| CLI Argument | Description |
|---|---|
| `--app <name>` | Target a specific app by name |
| `--all` | Run all apps in dependency order |
| `--config`, `-c` | Config file path (default: `kintone-migrator.yaml`) |

Apps are executed in topological order based on `dependsOn`. Circular dependencies are detected and reported as errors. `--all` stops on first failure (fail-fast).

Configuration merge priority (high to low): CLI arguments > environment variables > app-level settings > top-level settings.

#### File Path Resolution in Multi-App Mode

In multi-app mode, each command resolves its config file path using a convention-based default (`<domain>/<appName>.yaml`). CLI arguments and environment variables take precedence if specified.

| Command Group | Multi-App Default Path | Single-App Default Path |
|---|---|---|
| `schema` | `schemas/<appName>.yaml` | `schema.yaml` |
| `seed` | `seeds/<appName>.yaml` | `seed.yaml` |
| `customize` | `customize/<appName>.yaml` | `customize.yaml` |
| `field-acl` | `field-acl/<appName>.yaml` | `field-acl.yaml` |
| `view` | `view/<appName>.yaml` | `views.yaml` |
| `app-acl` | `app-acl/<appName>.yaml` | `app-acl.yaml` |
| `record-acl` | `record-acl/<appName>.yaml` | `record-acl.yaml` |
| `process` | `process/<appName>.yaml` | `process.yaml` |
| `settings` | `settings/<appName>.yaml` | `settings.yaml` |
| `notification` | `notification/<appName>.yaml` | `notification.yaml` |
| `report` | `report/<appName>.yaml` | `reports.yaml` |
| `action` | `action/<appName>.yaml` | `actions.yaml` |
| `admin-notes` | `admin-notes/<appName>.yaml` | `admin-notes.yaml` |
| `plugin` | `plugin/<appName>.yaml` | `plugins.yaml` |

All file paths can be explicitly overridden per app in the project config. If not specified, the convention-based default path is used.

For details, see [Project Config Specification](./spec/projectConfig.md).

## Commands

Commands are organized into domain groups:

| Command | Description |
|---|---|
| `init` | Initialize a project from a kintone space |

| Group | Subcommand | Description |
|---|---|---|
| `schema` | `diff` | Show differences between schema file and kintone form |
| `schema` | `migrate` | Apply schema changes (incremental) |
| `schema` | `override` | Overwrite entire form from schema |
| `schema` | `capture` | Save current form schema to file |
| `schema` | `validate` | Validate schema file locally |
| `schema` | `dump` | Dump raw field/layout JSON (for debugging) |
| `seed` | `apply` | Apply seed data records |
| `seed` | `capture` | Capture records from kintone app |
| `customize` | `apply` | Apply JS/CSS customizations |
| `field-acl` | `apply` | Apply field access permissions |
| `field-acl` | `capture` | Save current field permissions to file |
| `view` | `apply` | Apply view (list) settings |
| `view` | `capture` | Save current view settings to file |
| `app-acl` | `apply` | Apply app-level access permissions |
| `app-acl` | `capture` | Save current app permissions to file |
| `record-acl` | `apply` | Apply record-level access permissions |
| `record-acl` | `capture` | Save current record permissions to file |
| `process` | `apply` | Apply process management (workflow) settings |
| `process` | `capture` | Save current process management settings to file |
| `settings` | `apply` | Apply general app settings |
| `settings` | `capture` | Save current general settings to file |
| `notification` | `apply` | Apply notification settings |
| `notification` | `capture` | Save current notification settings to file |
| `report` | `apply` | Apply graph/report settings |
| `report` | `capture` | Save current report settings to file |
| `action` | `apply` | Apply action settings |
| `action` | `capture` | Save current action settings to file |
| `admin-notes` | `apply` | Apply admin notes |
| `admin-notes` | `capture` | Save current admin notes to file |
| `plugin` | `apply` | Apply plugin settings |
| `plugin` | `capture` | Save current plugin settings to file |

All commands support `--app <name>` and `--all` for [multi-app mode](#multi-app-project-config). Commands that modify data (`schema migrate`, `schema override`, `seed apply --clean`, `customize apply`) support `--yes` / `-y` to skip confirmation prompts.

### `init` -- Project Initialization

Initializes a project from a kintone space. Fetches all apps in the specified space, generates a `kintone-migrator.yaml` config file with `files` object format, and captures all domain configurations for each app.

```bash
kintone-migrator init <spaceId>
kintone-migrator init <spaceId> --yes    # Skip confirmation prompts
```

| Option | Description |
|---|---|
| `<spaceId>` | kintone space ID (required argument) |
| `--domain`, `-d` | kintone domain |
| `--api-token`, `-t` | API token |
| `--username`, `-u` | Username |
| `--password`, `-p` | Password |
| `--guest-space-id`, `-g` | Guest space ID |
| `--output`, `-o` | Output config file path (default: `kintone-migrator.yaml`) |
| `--yes`, `-y` | Skip confirmation prompts |

The generated config uses the `files` object format with all domain file paths pre-configured. For each app, schema, view, settings, notification, report, action, process, field-acl, app-acl, record-acl, admin-notes, and plugin configurations are captured.

### `schema` -- Form Schema Management

#### `schema diff`

Detects differences between the schema file and the current kintone form.

```bash
kintone-migrator schema diff
kintone-migrator schema diff --app customer
```

#### `schema migrate`

Applies only the detected differences (add, update, delete) to the kintone form.

```bash
kintone-migrator schema migrate
kintone-migrator schema migrate --yes          # Skip confirmation (for CI/CD)
kintone-migrator schema migrate --all --yes    # All apps
```

#### `schema override`

Overwrites the entire kintone form with the schema file. Fields not in the schema are deleted.

```bash
kintone-migrator schema override
kintone-migrator schema override --reset       # Delete all custom fields (no schema needed)
kintone-migrator schema override --all --yes
```

| Option | Description |
|---|---|
| `--reset` | Delete all custom fields. In multi-app mode, apps are reset in reverse dependency order. |
| `--yes`, `-y` | Skip confirmation prompts. |

#### `schema capture`

Saves the current kintone form schema to a YAML file.

```bash
kintone-migrator schema capture
kintone-migrator schema capture -f my-schema.yaml
```

#### `schema validate`

Validates the schema file locally without connecting to kintone.

```bash
kintone-migrator schema validate
kintone-migrator schema validate -f my-schema.yaml
```

#### `schema dump`

Dumps raw kintone field definitions and layout as JSON. Outputs `fields.json` and `layout.json` (prefixed with app name in multi-app mode).

```bash
kintone-migrator schema dump
```

### `seed` -- Seed Data Management

#### `seed apply`

Upserts seed data records into a kintone app.

```bash
kintone-migrator seed apply                    # Apply seed data
kintone-migrator seed apply --clean --yes      # Delete all records first
```

| Option | Description |
|---|---|
| `--seed-file`, `-s` | Seed file path (default: `seed.yaml`) |
| `--key-field`, `-k` | Key field code for upsert |
| `--clean` | Delete all records before applying. |
| `--yes`, `-y` | Skip confirmation prompts (for `--clean` mode). |

#### `seed capture`

Captures existing records from a kintone app and saves them to a seed file.

```bash
kintone-migrator seed capture --key-field customer_code
```

| Option | Description |
|---|---|
| `--seed-file`, `-s` | Seed file path (default: `seed.yaml`) |
| `--key-field`, `-k` | Key field code (required) |

### `customize` -- JS/CSS Customization

#### `customize apply`

Applies JS/CSS customizations from a YAML config file. Local files are uploaded and merged with existing settings.

```bash
kintone-migrator customize apply
kintone-migrator customize apply --customize-file my-customize.yaml
kintone-migrator customize apply --all --yes
```

| Option | Environment Variable | Description |
|---|---|---|
| `--customize-file` | `CUSTOMIZE_FILE_PATH` | Config file path (default: `customize.yaml`, multi-app: `customize/<appName>.yaml`) |
| `--yes`, `-y` | -- | Skip confirmation prompts. |

### `field-acl` -- Field Access Permissions

#### `field-acl apply`

Applies field access permissions from a YAML config file. Uses full replacement -- the file defines the complete desired state.

```bash
kintone-migrator field-acl apply
kintone-migrator field-acl apply --field-acl-file my-field-acl.yaml
```

| Option | Environment Variable | Description |
|---|---|---|
| `--field-acl-file` | `FIELD_ACL_FILE_PATH` | Field ACL file path (default: `field-acl.yaml`, multi-app: `field-acl/<appName>.yaml`) |

#### `field-acl capture`

Captures the current field access permissions and saves them to a YAML file. Uses the same `--field-acl-file` option as `field-acl apply`.

```bash
kintone-migrator field-acl capture
kintone-migrator field-acl capture --field-acl-file my-field-acl.yaml
```

### `view` -- View (List) Settings

#### `view apply`

Applies view settings from a YAML config file.

```bash
kintone-migrator view apply
kintone-migrator view apply --view-file my-views.yaml
```

#### `view capture`

Captures the current view settings and saves them to a YAML file.

```bash
kintone-migrator view capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--view-file` | `VIEW_FILE_PATH` | View file path (default: `views.yaml`, multi-app: `view/<appName>.yaml`) |

### `app-acl` -- App Access Permissions

#### `app-acl apply`

Applies app-level access permissions from a YAML config file.

```bash
kintone-migrator app-acl apply
kintone-migrator app-acl apply --app-acl-file my-app-acl.yaml
```

#### `app-acl capture`

Captures the current app access permissions and saves them to a YAML file.

```bash
kintone-migrator app-acl capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--app-acl-file` | `APP_ACL_FILE_PATH` | App ACL file path (default: `app-acl.yaml`, multi-app: `app-acl/<appName>.yaml`) |

### `record-acl` -- Record Access Permissions

#### `record-acl apply`

Applies record-level access permissions from a YAML config file.

```bash
kintone-migrator record-acl apply
kintone-migrator record-acl apply --record-acl-file my-record-acl.yaml
```

#### `record-acl capture`

Captures the current record access permissions and saves them to a YAML file.

```bash
kintone-migrator record-acl capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--record-acl-file` | `RECORD_ACL_FILE_PATH` | Record ACL file path (default: `record-acl.yaml`, multi-app: `record-acl/<appName>.yaml`) |

### `process` -- Process Management (Workflow)

#### `process apply`

Applies process management settings (statuses, actions, assignees) from a YAML config file.

```bash
kintone-migrator process apply
kintone-migrator process apply --process-file my-process.yaml
```

#### `process capture`

Captures the current process management settings and saves them to a YAML file.

```bash
kintone-migrator process capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--process-file` | `PROCESS_FILE_PATH` | Process management file path (default: `process.yaml`, multi-app: `process/<appName>.yaml`) |

### `settings` -- General Settings

#### `settings apply`

Applies general app settings (name, description, icon, theme, etc.) from a YAML config file.

```bash
kintone-migrator settings apply
kintone-migrator settings apply --settings-file my-settings.yaml
```

#### `settings capture`

Captures the current general settings and saves them to a YAML file.

```bash
kintone-migrator settings capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--settings-file` | `SETTINGS_FILE_PATH` | General settings file path (default: `settings.yaml`, multi-app: `settings/<appName>.yaml`) |

### `notification` -- Notification Settings

#### `notification apply`

Applies notification settings (general, per-record, reminder) from a YAML config file.

```bash
kintone-migrator notification apply
kintone-migrator notification apply --notification-file my-notification.yaml
```

#### `notification capture`

Captures the current notification settings and saves them to a YAML file.

```bash
kintone-migrator notification capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--notification-file` | `NOTIFICATION_FILE_PATH` | Notification file path (default: `notification.yaml`, multi-app: `notification/<appName>.yaml`) |

### `report` -- Graph/Report Settings

#### `report apply`

Applies graph and report settings from a YAML config file.

```bash
kintone-migrator report apply
kintone-migrator report apply --report-file my-reports.yaml
```

#### `report capture`

Captures the current report settings and saves them to a YAML file.

```bash
kintone-migrator report capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--report-file` | `REPORT_FILE_PATH` | Report file path (default: `reports.yaml`, multi-app: `report/<appName>.yaml`) |

### `action` -- Action Settings

#### `action apply`

Applies action settings (record copy actions) from a YAML config file.

```bash
kintone-migrator action apply
kintone-migrator action apply --action-file my-actions.yaml
```

#### `action capture`

Captures the current action settings and saves them to a YAML file.

```bash
kintone-migrator action capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--action-file` | `ACTION_FILE_PATH` | Action file path (default: `actions.yaml`, multi-app: `action/<appName>.yaml`) |

### `admin-notes` -- Admin Notes

#### `admin-notes apply`

Applies admin notes from a YAML config file.

```bash
kintone-migrator admin-notes apply
kintone-migrator admin-notes apply --admin-notes-file my-notes.yaml
```

#### `admin-notes capture`

Captures the current admin notes and saves them to a YAML file.

```bash
kintone-migrator admin-notes capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--admin-notes-file` | `ADMIN_NOTES_FILE_PATH` | Admin notes file path (default: `admin-notes.yaml`, multi-app: `admin-notes/<appName>.yaml`) |

### `plugin` -- Plugin Settings

#### `plugin apply`

Applies plugin settings (enable/disable installed plugins) from a YAML config file.

```bash
kintone-migrator plugin apply
kintone-migrator plugin apply --plugin-file my-plugins.yaml
```

#### `plugin capture`

Captures the current plugin settings and saves them to a YAML file.

```bash
kintone-migrator plugin capture
```

| Option | Environment Variable | Description |
|---|---|---|
| `--plugin-file` | `PLUGIN_FILE_PATH` | Plugin file path (default: `plugins.yaml`, multi-app: `plugin/<appName>.yaml`) |

## File Formats

### Schema File

Defines the desired kintone form configuration. The `layout` key describes form rows, groups, subtables, and fields.

```yaml
layout:
  - type: ROW
    fields:
      - code: customer_name
        type: SINGLE_LINE_TEXT
        label: 顧客名
        size: { width: "200" }
        required: true
        unique: true
  - type: GROUP
    code: detail_group
    label: 詳細情報
    layout:
      - type: ROW
        fields:
          - code: note
            type: MULTI_LINE_TEXT
            label: 備考
            size: { width: "400" }
```

Supported field types: `SINGLE_LINE_TEXT`, `MULTI_LINE_TEXT`, `RICH_TEXT`, `NUMBER`, `CALC`, `CHECK_BOX`, `RADIO_BUTTON`, `MULTI_SELECT`, `DROP_DOWN`, `DATE`, `TIME`, `DATETIME`, `LINK`, `USER_SELECT`, `ORGANIZATION_SELECT`, `GROUP_SELECT`, `FILE`, `GROUP`, `SUBTABLE`, `REFERENCE_TABLE`

Lookup fields and reference tables are also supported. For details, see:

- [Schema Specification](./spec/schema.md) -- format reference, all field types, and validation rules
- [Sample Schema (YAML)](./spec/sample_schema.yaml) / [JSON](./spec/sample_schema.json) -- comprehensive examples

### Seed Data File

Defines records to upsert into a kintone app. The `key` field specifies which field to match on (must have "Prohibit duplicate values" enabled).

```yaml
key: customer_code
records:
  - customer_code: "C001"
    customer_name: "Test Corp"
    priority: "high"
    tags:
      - "VIP"
      - "long-term"
```

For field type mappings and details, see [Seed Data Specification](./spec/seed.md).

### Customization Config File

Defines JS/CSS resources to apply to a kintone app. Existing resources not in the config are preserved.

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
```

For details, see [Customization Specification](./spec/domains/customization.md).

### Field ACL File

Defines field-level access permissions. The file represents the complete desired state -- all permissions are replaced on apply.

```yaml
rights:
  - code: salary
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: admin_user
      - accessibility: READ
        entity:
          type: GROUP
          code: managers
        includeSubs: true
      - accessibility: NONE
        entity:
          type: ORGANIZATION
          code: general_staff
```

For details, see [Field Permission Specification](./spec/domains/fieldPermission.md).

### View File

Defines view (list) settings. Views are identified by name.

```yaml
views:
  一覧:
    type: LIST
    index: 0
    fields:
      - customer_name
      - customer_code
      - status
    filterCond: status in ("active")
    sort: customer_code asc
    pager: true
    device: ANY
  カレンダー:
    type: CALENDAR
    index: 1
    date: scheduled_date
    title: customer_name
```

View types: `LIST`, `CALENDAR`, `CUSTOM`. For details, see [View Specification](./spec/domains/view.md).

### App ACL File

Defines app-level access permissions.

```yaml
rights:
  - entity:
      type: USER
      code: admin_user
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
  - entity:
      type: GROUP
      code: general_staff
    includeSubs: false
    appEditable: false
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: false
    recordImportable: false
    recordExportable: false
```

For details, see [App Permission Specification](./spec/domains/appPermission.md).

### Record ACL File

Defines record-level access permissions with filter conditions.

```yaml
rights:
  - filterCond: status in ("active")
    entities:
      - entity:
          type: USER
          code: admin_user
        viewable: true
        editable: true
        deletable: true
        includeSubs: false
      - entity:
          type: GROUP
          code: general_staff
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
```

For details, see [Record Permission Specification](./spec/domains/recordPermission.md).

### Process Management File

Defines workflow statuses and actions.

```yaml
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: CREATOR
  処理中:
    index: 1
    assignee:
      type: ONE
      entities:
        - type: USER
          code: manager
  完了:
    index: 2
    assignee:
      type: ONE
      entities: []
actions:
  - name: 処理開始
    from: 未処理
    to: 処理中
    filterCond: ""
    type: PRIMARY
  - name: 完了にする
    from: 処理中
    to: 完了
    filterCond: ""
    type: PRIMARY
```

For details, see [Process Management Specification](./spec/domains/processManagement.md).

### General Settings File

Defines general app settings. All fields are optional -- only specified fields are updated.

```yaml
name: 顧客管理
description: 顧客情報を管理するアプリ
icon:
  type: PRESET
  key: APP006
theme: WHITE
titleField:
  selectionMode: MANUAL
  code: customer_name
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
numberPrecision:
  digits: 16
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
```

For details, see [General Settings Specification](./spec/domains/generalSettings.md).

### Notification File

Defines notification settings (general notifications, per-record notifications, and reminders).

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
perRecord:
  - filterCond: priority in ("high")
    title: 高優先度レコードの更新
    targets:
      - entity:
          type: USER
          code: manager
reminder:
  timezone: Asia/Tokyo
  notifications:
    - code: deadline
      daysLater: -1
      time: "09:00"
      filterCond: status not in ("完了")
      title: 締切日リマインダー
      targets:
        - entity:
            type: FIELD_ENTITY
            code: creator
```

For details, see [Notification Specification](./spec/domains/notification.md).

### Report File

Defines graph and report settings. Reports are identified by name.

```yaml
reports:
  月別売上:
    chartType: COLUMN
    chartMode: NORMAL
    index: 0
    groups:
      - code: order_date
        per: MONTH
    aggregations:
      - type: SUM
        code: amount
    filterCond: ""
    sorts:
      - by: GROUP1
        order: ASC
  担当者別件数:
    chartType: PIE
    index: 1
    groups:
      - code: assignee
    aggregations:
      - type: COUNT
    filterCond: status in ("active")
    sorts:
      - by: TOTAL
        order: DESC
```

Chart types: `BAR`, `COLUMN`, `PIE`, `LINE`, `PIVOT_TABLE`, `TABLE`, `AREA`, `SPLINE`, `SPLINE_AREA`. For details, see [Report Specification](./spec/domains/report.md).

### Action File

Defines record copy action settings. Actions are identified by name.

```yaml
actions:
  案件コピー:
    index: 0
    destApp:
      app: "20"
    mappings:
      - srcType: FIELD
        srcField: customer_name
        destField: customer_name
      - srcType: RECORD_URL
        destField: source_url
    entities:
      - type: USER
        code: admin_user
    filterCond: status in ("approved")
```

For details, see [Action Specification](./spec/domains/action.md).

### Admin Notes File

Defines admin notes content.

```yaml
content: |
  <h2>アプリ管理メモ</h2>
  <p>このアプリは顧客管理用です。</p>
includeInTemplateAndDuplicates: true
```

For details, see [Admin Notes Specification](./spec/domains/adminNotes.md).

### Plugin File

Defines plugin enable/disable settings.

```yaml
plugins:
  - id: djmhffjlbojgcbnahicgdjiahbegolkj
    name: 条件分岐プラグイン
    enabled: true
  - id: pafgcfghlmjicbadmkohfoihfkblahhe
    name: カレンダーPlusプラグイン
    enabled: false
```

For details, see [Plugin Specification](./spec/domains/plugin.md).

## License

MIT
