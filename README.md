# kintone-migrator

A CLI tool for migrating kintone form schemas.

Compares a YAML-defined schema file against an actual kintone app form, providing diff detection, migration, schema capture, and more.

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
| `--username`, `-u` | `KINTONE_USERNAME` | kintone username |
| `--password`, `-p` | `KINTONE_PASSWORD` | kintone password |
| `--app-id`, `-a` | `KINTONE_APP_ID` | kintone app ID |
| `--schema-file`, `-f` | `SCHEMA_FILE_PATH` | Schema file path (default: `schema.yaml`) |

### .env File

Environment variables can also be defined in a `.env` file and loaded with `dotenv-cli` or similar tools.

```env
KINTONE_DOMAIN=example.cybozu.com
KINTONE_USERNAME=your_username
KINTONE_PASSWORD=your_password
KINTONE_APP_ID=123
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

## License

MIT
