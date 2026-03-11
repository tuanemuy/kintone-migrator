# Testing

## Running Tests

- `pnpm test` — Run all tests with Vitest
- `pnpm test:coverage` — Run tests with coverage report (thresholds enforced)
- `pnpm typecheck` — Type check with tsgo
- `pnpm lint:fix` — Lint and auto-fix with Biome
- `pnpm format` — Format with Biome

## Test Organization

- **Domain layer tests**: `src/core/domain/${domain}/services/__tests__/*.test.ts`
  - Domain parsers receive pre-parsed JavaScript objects (not YAML strings)
  - Domain serializers return `Record<string, unknown>` (not YAML strings)
- **Application layer tests**: `src/core/application/${domain}/__tests__/*.test.ts`
  - Test helpers: `src/core/application/__tests__/helpers.ts` provides `setupTest*Container()` factories
- **Adapter tests**: `src/core/adapters/${provider}/__tests__/*.test.ts`

## Test Patterns

- Use in-memory test containers from `helpers.ts` (e.g., `setupTestActionContainer()`)
- Only when it is difficult to use actual adapters, prepare Empty adapters and mock it using `vi.spyOn`, etc.
- YAML parsing/serialization is tested at the adapter level (`configCodec.test.ts`) and application level (`parseYamlText`, `stringifyToYaml`). Domain tests do not involve YAML.

## Manual Testing (kintone Integration)

Requires a kintone environment with valid credentials.

### Environment Variables

Set these in `.env` or export them:
- `KINTONE_BASE_URL` — kintone domain (e.g., `https://example.cybozu.com`)
- `KINTONE_USERNAME` / `KINTONE_PASSWORD` — Password auth
- `KINTONE_API_TOKEN` — API token auth (alternative to password)
- `KINTONE_APP_ID` — Target app ID
- `KINTONE_GUEST_SPACE_ID` — Guest space ID (optional)

### Subcommand Checklist

| Subcommand | Capture | Apply | Diff |
|---|---|---|---|
| schema | `pnpm dev:capture` | `pnpm dev:migrate` | `pnpm dev:diff` |
| seed | — | `pnpm dev:seed` | — |
| customize | — | `pnpm dev:customize` | — |
| field-acl | `pnpm dev:capture-field-acl` | `pnpm dev:field-acl` | — |
| action | `pnpm dev -- action capture` | `pnpm dev -- action apply` | `pnpm dev -- action diff` |
| notification | `pnpm dev -- notification capture` | `pnpm dev -- notification apply` | `pnpm dev -- notification diff` |
| view | `pnpm dev -- view capture` | `pnpm dev -- view apply` | `pnpm dev -- view diff` |
| process | `pnpm dev -- process capture` | `pnpm dev -- process apply` | — |
| settings | `pnpm dev -- settings capture` | `pnpm dev -- settings apply` | — |
| admin-notes | `pnpm dev -- admin-notes capture` | `pnpm dev -- admin-notes apply` | — |
| app-acl | `pnpm dev -- app-acl capture` | `pnpm dev -- app-acl apply` | — |
| record-acl | `pnpm dev -- record-acl capture` | `pnpm dev -- record-acl apply` | — |
| plugin | `pnpm dev -- plugin capture` | `pnpm dev -- plugin apply` | — |
| report | `pnpm dev -- report capture` | `pnpm dev -- report apply` | — |
