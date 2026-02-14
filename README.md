# kintone-migrator

A CLI tool for migrating kintone form schemas and seed data.

Compares a YAML-defined schema file against an actual kintone app form, providing diff detection, migration, schema capture, seed data management, and more.

## Installation

```bash
npm install -g kintone-migrator
```

Requires Node.js 22 or later.

## Configuration

Connection details for kintone can be specified via CLI arguments or environment variables. CLI arguments take precedence.

### kintone Connection

| CLI Argument | Environment Variable | Description |
|---------|----------|------|
| `--domain`, `-d` | `KINTONE_DOMAIN` | kintone domain (e.g., `example.cybozu.com`) |
| `--api-token`, `-t` | `KINTONE_API_TOKEN` | kintone API token |
| `--username`, `-u` | `KINTONE_USERNAME` | kintone username |
| `--password`, `-p` | `KINTONE_PASSWORD` | kintone password |
| `--app-id`, `-a` | `KINTONE_APP_ID` | kintone app ID |
| `--guest-space-id`, `-g` | `KINTONE_GUEST_SPACE_ID` | kintone guest space ID |
| `--schema-file`, `-f` | `SCHEMA_FILE_PATH` | Schema file path (default: `schema.yaml`) |

### Multi-App Options

These options are available on **all commands** (diff, migrate, override, capture, dump, validate, seed) and enable multi-app mode via a project config file.

| CLI Argument | Description |
|---------|------|
| `--app <name>` | Target a specific app by name (from project config) |
| `--all` | Run all apps in dependency order |
| `--config`, `-c` | Project config file path (default: `kintone-migrator.yaml`) |

**Mutual exclusion rules:**

- `--app` and `--all` cannot be used together
- `--app-id` and `--app` cannot be used together
- `--app-id` and `--all` cannot be used together

### Authentication

Two authentication methods are supported:

- **API Token** (`KINTONE_API_TOKEN`): Recommended. Scoped per app for better security. Multiple tokens can be specified as a comma-separated string (e.g., `token1,token2`).
- **Username/Password** (`KINTONE_USERNAME` / `KINTONE_PASSWORD`): Basic authentication with user credentials.

If both are provided, API Token takes priority. At least one method must be configured.

### .env File

Environment variables can also be defined in a `.env` file and loaded with `dotenv-cli` or similar tools.

```env
KINTONE_DOMAIN=example.cybozu.com

# Authentication: Use either API Token or Username/Password (API Token takes priority)
# KINTONE_API_TOKEN=your_api_token
KINTONE_USERNAME=your_username
KINTONE_PASSWORD=your_password

KINTONE_APP_ID=123
# KINTONE_GUEST_SPACE_ID=456
SCHEMA_FILE_PATH=schema.yaml
```

## Commands

### `diff`

Detects differences between the schema file and the current kintone form.

```bash
kintone-migrator diff
kintone-migrator diff -d example.cybozu.com -a 123

# Multi-app mode
kintone-migrator diff --app customer
kintone-migrator diff --all
```

### `migrate`

Applies schema file changes to the kintone form. Displays the diff and prompts for confirmation before execution. Only detected differences are applied (add, update, delete).

```bash
kintone-migrator migrate

# Skip confirmation prompts (for CI/CD)
kintone-migrator migrate --yes
kintone-migrator migrate -y

# Multi-app mode
kintone-migrator migrate --app customer
kintone-migrator migrate --all
kintone-migrator migrate --all --yes
```

### `override`

Overwrites the entire kintone form with the schema file contents. Fields not defined in the schema will be deleted.

```bash
kintone-migrator override

# Skip confirmation prompts (for CI/CD)
kintone-migrator override --yes
kintone-migrator override -y

# Reset form: delete all custom fields (no schema file needed)
kintone-migrator override --reset

# Multi-app mode
kintone-migrator override --all
kintone-migrator override --reset --all
kintone-migrator override --all --yes
```

#### Override-specific arguments

| CLI Argument | Description |
|---------|------|
| `--reset` | Reset form by deleting all custom fields. Cannot be used with `--schema-file`. In multi-app mode (`--all`), apps are reset in reverse dependency order. |
| `--yes`, `-y` | Skip confirmation prompts. Also available on `migrate`. |

### `capture`

Saves the current kintone form schema to a file.

```bash
kintone-migrator capture
kintone-migrator capture -f my-schema.yaml

# Multi-app mode
kintone-migrator capture --app customer
kintone-migrator capture --all
```

### `dump`

Dumps kintone form field definitions and layout in JSON format. For debugging purposes.

```bash
kintone-migrator dump

# Multi-app mode
kintone-migrator dump --app customer
kintone-migrator dump --all
```

`fields.json` and `layout.json` will be output to the current directory. In multi-app mode, files are prefixed with the app name (e.g., `customer_fields.json`).

### `validate`

Validates the schema file locally without connecting to kintone. Checks for structural issues such as empty labels, missing selection options, invalid lookup configurations, and more.

```bash
kintone-migrator validate
kintone-migrator validate -f my-schema.yaml

# Multi-app mode
kintone-migrator validate --app customer
kintone-migrator validate --all
```

### `seed`

Applies seed data (records) to a kintone app using upsert (insert or update based on a key field). Can also capture existing records from an app to a seed file.

```bash
# Apply seed data to a single app
kintone-migrator seed
kintone-migrator seed -s my-seed.yaml

# Capture records from a kintone app
kintone-migrator seed --capture --key-field customer_code
kintone-migrator seed --capture --key-field customer_code -s seeds/customer.yaml

# Multi-app mode
kintone-migrator seed --all
kintone-migrator seed --capture --key-field code --all
kintone-migrator seed --app customer
```

#### Seed-specific arguments

| CLI Argument | Description |
|---------|------|
| `--capture` | Capture mode: fetch records from kintone and save to seed file |
| `--key-field`, `-k` | Key field code for upsert (required for `--capture`) |
| `--seed-file`, `-s` | Seed file path (default: `seed.yaml`) |

## Schema File

Schema files define the desired kintone form configuration in YAML format. The `layout` key at the root describes form rows, groups, subtables, and field definitions.

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
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: note
            type: MULTI_LINE_TEXT
            label: 備考
            size: { width: "400" }
```

### Lookup Fields

`SINGLE_LINE_TEXT`, `NUMBER`, and `LINK` fields can be configured as lookup fields by adding a `lookup` property. Lookups are not a separate field type in kintone; they are a property of these field types.

```yaml
- code: customer_code
  type: SINGLE_LINE_TEXT
  label: 顧客コード
  size: { width: "200" }
  lookup:
    relatedApp: { app: "10" }
    relatedKeyField: code
    fieldMappings:
      - { field: customer_name, relatedField: name }
      - { field: email, relatedField: contact_email }
    lookupPickerFields: [code, name, contact_email]
    filterCond: 'status in ("active")'
    sort: "code asc"
```

### Reference Tables

`REFERENCE_TABLE` fields display related records from another app.

```yaml
- code: related_orders
  type: REFERENCE_TABLE
  label: 関連注文
  size: { width: "600" }
  referenceTable:
    relatedApp: { app: "42" }
    condition: { field: customer_name, relatedField: name }
    filterCond: 'status in ("active")'
    displayFields: [name, email, phone]
    sort: "name asc"
    size: "5"
```

### Supported Field Types

| Type | Description |
|------|-------------|
| `SINGLE_LINE_TEXT` | Single-line text |
| `MULTI_LINE_TEXT` | Multi-line text |
| `RICH_TEXT` | Rich text editor |
| `NUMBER` | Number |
| `CALC` | Calculated field |
| `CHECK_BOX` | Checkbox (multi-select) |
| `RADIO_BUTTON` | Radio button (single-select) |
| `MULTI_SELECT` | Multi-select |
| `DROP_DOWN` | Dropdown (single-select) |
| `DATE` | Date |
| `TIME` | Time |
| `DATETIME` | Date and time |
| `LINK` | Link (URL, phone, email) |
| `USER_SELECT` | User selection |
| `ORGANIZATION_SELECT` | Organization selection |
| `GROUP_SELECT` | Group selection |
| `FILE` | File attachment |
| `GROUP` | Field group (collapsible) |
| `SUBTABLE` | Subtable |
| `REFERENCE_TABLE` | Reference table |

For the full specification and all supported field types, see:

- [Schema Specification](./spec/schema.md) — format reference for all field types, layout items, decoration elements, and validation rules
- [Sample Schema (YAML)](./spec/sample_schema.yaml) — comprehensive example covering all field types
- [Sample Schema (JSON)](./spec/sample_schema.json) — equivalent example in JSON format

## Seed Data File

Seed data files define records to be upserted into a kintone app. The `key` field specifies which field to use for matching existing records (must have the "Prohibit duplicate values" setting enabled in kintone).

```yaml
key: customer_code
records:
  - customer_code: "C001"
    customer_name: "Test Corp"
    priority: "high"
    tags:
      - "VIP"
      - "long-term"
    assignee:
      - code: "user1"
    start_date: "2025-01-15"
    order_items:
      - product_name: "Product A"
        quantity: "1"
        price: "1000"
```

### Seed Field Value Types

| kintone Field Type | YAML Representation | Example |
|------|-------------|---------|
| `SINGLE_LINE_TEXT`, `MULTI_LINE_TEXT`, `RICH_TEXT` | string | `"text"` |
| `NUMBER` | string | `"1000"` |
| `RADIO_BUTTON`, `DROP_DOWN` | string | `"high"` |
| `CHECK_BOX`, `MULTI_SELECT` | string[] | `["VIP", "long-term"]` |
| `DATE` | string (YYYY-MM-DD) | `"2025-01-15"` |
| `TIME` | string (HH:mm) | `"09:00"` |
| `DATETIME` | string (ISO 8601) | `"2025-01-15T09:00:00Z"` |
| `LINK` | string | `"https://example.com"` |
| `USER_SELECT`, `ORGANIZATION_SELECT`, `GROUP_SELECT` | object[] with `code` | `[{code: "user1"}]` |
| `SUBTABLE` | object[] | `[{field1: "val1"}]` |

For the full specification, see:

- [Seed Data Specification](./spec/seed.md) — format reference, field type mappings, and validation rules

## Multi-App Project Config

A project config file (`kintone-migrator.yaml`) enables managing multiple kintone apps with dependency ordering. All commands (diff, migrate, override, capture, dump, validate, seed) support multi-app mode.

```yaml
# Shared connection settings (can be overridden per app)
# domain can also be set via KINTONE_DOMAIN env var or --domain CLI arg
domain: example.cybozu.com
auth:
  apiToken: "shared-token"
# guestSpaceId: "456"

# App definitions
apps:
  customer:
    appId: "10"
    schemaFile: schemas/customer.yaml
    seedFile: seeds/customer.yaml
  order:
    appId: "20"
    schemaFile: schemas/order.yaml
    seedFile: seeds/order.yaml
    dependsOn:
      - customer
  invoice:
    appId: "30"
    dependsOn:
      - order
      - customer
```

### App Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `appId` | Yes | kintone app ID |
| `schemaFile` | No | Schema file path (default: `schemas/<appName>.yaml`) |
| `seedFile` | No | Seed file path (default: `seeds/<appName>.yaml`) |
| `domain` | No | App-specific kintone domain (overrides top-level) |
| `auth` | No | App-specific authentication (overrides top-level) |
| `guestSpaceId` | No | App-specific guest space ID |
| `dependsOn` | No | List of app names this app depends on |

### Configuration Merge Priority (high to low)

1. CLI arguments (`--domain`, `--api-token`, etc.)
2. Environment variables (`KINTONE_DOMAIN`, `KINTONE_API_TOKEN`, etc.)
3. App-level settings (per `apps.<name>`)
4. Top-level settings

### Authentication in Config File

```yaml
# API Token authentication
auth:
  apiToken: "your-token"

# Username/Password authentication
auth:
  username: "your-username"
  password: "your-password"
```

### Dependency Resolution

Apps are executed in topological order based on `dependsOn` declarations. Same-level apps are sorted alphabetically for deterministic ordering. Circular dependencies are detected and reported as errors.

### Execution Behavior

- **`--all`**: Executes all apps in dependency order. Stops on first failure (fail-fast). Remaining apps are skipped.
- **`--app <name>`**: Executes only the specified app.
- **`--reset --all`**: Resets apps in **reverse** dependency order (dependent apps first) to avoid reference integrity issues.

For the full specification, see:

- [Project Config Specification](./spec/projectConfig.md) — format reference, validation rules, and dependency resolution

## License

MIT
