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

| CLI Argument | Environment Variable | Description |
|---------|----------|------|
| `--domain`, `-d` | `KINTONE_DOMAIN` | kintone domain (e.g., `example.cybozu.com`) |
| `--api-token`, `-t` | `KINTONE_API_TOKEN` | kintone API token |
| `--username`, `-u` | `KINTONE_USERNAME` | kintone username |
| `--password`, `-p` | `KINTONE_PASSWORD` | kintone password |
| `--app-id`, `-a` | `KINTONE_APP_ID` | kintone app ID |
| `--guest-space-id`, `-g` | `KINTONE_GUEST_SPACE_ID` | kintone guest space ID |
| `--schema-file`, `-f` | `SCHEMA_FILE_PATH` | Schema file path (default: `schema.yaml`) |

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
```

### `migrate`

Applies schema file changes to the kintone form. Displays the diff and prompts for confirmation before execution.

```bash
kintone-migrator migrate
```

### `override`

Overwrites the entire kintone form with the schema file contents. Fields not defined in the schema will be deleted.

```bash
kintone-migrator override
```

### `capture`

Saves the current kintone form schema to a file.

```bash
kintone-migrator capture
kintone-migrator capture -f my-schema.yaml
```

### `dump`

Dumps kintone form field definitions and layout in JSON format. For debugging purposes.

```bash
kintone-migrator dump
```

`fields.json` and `layout.json` will be output to the current directory.

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

For the full specification, see:

- [Seed Data Specification](./spec/seed.md) — format reference, field type mappings, and validation rules

## Multi-App Project Config

When using a project config file (`kintone-migrator.yaml`), seed files can be configured per app via the `seedFile` option:

```yaml
apps:
  customer:
    appId: "10"
    schemaFile: schemas/customer.yaml
    seedFile: seeds/customer.yaml
  order:
    appId: "20"
    seedFile: seeds/order.yaml
    dependsOn:
      - customer
```

If `seedFile` is omitted, it defaults to `seeds/<appName>.yaml`.

## License

MIT
