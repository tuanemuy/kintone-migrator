# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Principles

- Prioritize type safety by leveraging TypeScript's type system to the fullest extent
- Encourage a stateless, pure functional programming style

## Development Commands

- `pnpm dev` - Run CLI in development mode (via tsx)
- `pnpm dev:diff` - Run `schema diff` subcommand in dev mode
- `pnpm dev:migrate` - Run `schema migrate` subcommand in dev mode
- `pnpm dev:override` - Run `schema override` subcommand in dev mode
- `pnpm dev:capture` - Run `schema capture` subcommand in dev mode
- `pnpm dev:dump` - Run `schema dump` subcommand in dev mode
- `pnpm dev:validate` - Run `schema validate` subcommand in dev mode
- `pnpm dev:seed` - Run `seed apply` subcommand in dev mode
- `pnpm dev:customize` - Run `customize apply` subcommand in dev mode
- `pnpm dev:field-acl` - Run `field-acl apply` subcommand in dev mode
- `pnpm dev:capture-field-acl` - Run `field-acl capture` subcommand in dev mode
- `pnpm build` - Build with tsdown
- `pnpm start` - Run built CLI
- `pnpm lint` - Lint code with Biome
- `pnpm lint:fix` - Lint code with Biome and fix issues
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Type check code with tsgo
- `pnpm test` - Run tests with Vitest

## Code Quality

- Run `pnpm typecheck`, `pnpm run lint:fix` and `pnpm run format` after making changes to ensure code quality and consistency.

## Tech Stack

- **Runtime**: Node.js 22.x
- **CLI Framework**: gunshi
- **Build**: tsdown
- **Dev Runner**: tsx
- **Database**: kintone JavaScript SDK

## Core Architecture

Hexagonal architecture with domain-driven design principles:

- **Domain Layer** (`src/core/domain/`): Contains business logic, types, and port interfaces
    - `src/core/domain/${domain}/entity.ts`: Domain entities
    - `src/core/domain/${domain}/valueObject.ts`: Value objects
    - `src/core/domain/${domain}/ports/**.ts`: Port interfaces for external services (repositories, external APIs, etc.)
    - `src/core/domain/${domain}/services/**.ts`: Domain services for complex business logic
    - `src/core/domain/ports/yamlCodec.ts`: YAML codec port interface (domain layer does not depend on `yaml` library directly)
    - Domain parsers (`configParser.ts`) accept pre-parsed `unknown` data, not raw YAML text. YAML parsing is handled by the application layer.
    - Domain serializers (`configSerializer.ts`) return `Record<string, unknown>`, not YAML strings. YAML stringification is handled by the application layer.
    - `node:path` is used pragmatically in some domain services (e.g., `appFilePaths.ts`) since this is a Node.js CLI tool.
- **Adapter Layer** (`src/core/adapters/`): Contains concrete implementations for external services
    - `src/core/adapters/${externalServiceProvider}/**.ts`: Adapters for external services like databases, APIs, etc.
    - `src/core/adapters/yaml/yamlCodec.ts`: YAML codec adapter wrapping the `yaml` library
- **Application Layer** (`src/core/application/`): Contains use cases and application services
    - `src/core/application/container/cli.ts`: CLI dependency injection container
    - `src/core/application/${domain}/${usecase}.ts`: Application services that orchestrate domain logic. Each service is a function that takes a context object.
    - `src/core/domain/error.ts`: Error types for business logic
    - `src/core/domain/${domain}/errorCode.ts`: Error codes for each domain
    - `src/core/application/error.ts`: Error types for application layer
    - `src/core/application/__tests__/helpers.ts`: Test helpers for application services
- **Presentation Layer** (`src/cli/`): CLI commands built with gunshi
    - `src/cli/index.ts`: Main entry point with shebang
    - `src/cli/commands/`: Domain-grouped subcommand definitions (schema/, seed/, customize/, field-acl/)
    - `src/cli/commands/applyCommandFactory.ts`: Factory for apply commands (reduces boilerplate across 10+ commands)
    - `src/cli/commands/captureCommandFactory.ts`: Factory for capture commands
    - `src/cli/commands/diffCommandFactory.ts`: Factory for diff commands
    - `src/cli/config.ts`: Configuration resolver (CLI args > env vars)
    - `src/cli/output.ts`: Shared output formatting
    - `src/cli/handleError.ts`: Error handling

### Example Implementation

- `docs/backend_implementation_example.md`: Detailed examples of types, ports, adapters, application services and context object.

## Error Handling

### Domain Layer

- `src/core/domain/error.ts`: Defines `BusinessRuleError`.
- `src/core/domain/${domain}/errorCode.ts`: Error codes are defined within each respective domain.
- Avoids using `try-catch`; throws a `BusinessRuleError` exception when a violation can be determined by the logic.

### Application Layer

- `src/core/application/error.ts`: Defines the following errors:
    - `NotFoundError`
    - `ConflictError`
    - `UnauthenticatedError`
    - `ForbiddenError`
    - `ValidationError`
    - `SystemError`
- Defines error codes for each as needed (e.g., a `NETWORK_ERROR` code for `SystemError`).
- Avoids using `try-catch`; throws these exceptions when a failure can be determined by the application logic.
- Exception: `wrapBusinessRuleError()` uses `try-catch` to convert domain `BusinessRuleError` into application `ValidationError`, preserving the original error as `cause`.
- `parseYamlText()` and `stringifyToYaml()` in the application layer use `try-catch` to convert YAML library errors into `ValidationError`/`SystemError`.

### Infrastructure Layer

- Throws errors that are defined in the Domain and Application layers.
- Catches exceptions from external systems as necessary and transforms them into the errors defined above.

### Presentation Layer

- CLI commands catch all exceptions via `handleCliError` and transform them into formatted terminal output.

## Git / Pull Request

- Always run `git fetch origin` before creating branches, checking diffs, or comparing with remote branches. The local `origin/<base-branch>` ref can be stale.
