# kintone-migrator

A CLI tool for managing kintone apps as code -- form schemas, seed data, JS/CSS customizations, and field access permissions.

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

For managing multiple apps, create a project config file (`kintone-migrator.yaml`):

```yaml
domain: example.cybozu.com
auth:
  apiToken: "shared-token"

apps:
  customer:
    appId: "10"
    schemaFile: schemas/customer.yaml
    seedFile: seeds/customer.yaml
  order:
    appId: "20"
    schemaFile: schemas/order.yaml
    dependsOn:
      - customer
```

| Field | Required | Description |
|---|---|---|
| `appId` | Yes | kintone app ID |
| `schemaFile` | No | Schema file path (default: `schemas/<appName>.yaml`) |
| `seedFile` | No | Seed file path (default: `seeds/<appName>.yaml`) |
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

For details, see [Project Config Specification](./spec/projectConfig.md).

## Commands

Commands are organized into domain groups:

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

All commands support `--app <name>` and `--all` for [multi-app mode](#multi-app-project-config). Commands that modify data (`schema migrate`, `schema override`, `seed apply --clean`, `customize apply`) support `--yes` / `-y` to skip confirmation prompts.

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

## License

MIT
