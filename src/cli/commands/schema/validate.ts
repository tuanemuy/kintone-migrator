import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createValidateCliContainer } from "@/core/application/container/validateCli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import {
  type ValidateSchemaOutput,
  validateSchema,
} from "@/core/application/formSchema/validateSchema";
import type { ValidationIssue } from "@/core/domain/formSchema/services/schemaValidator";
import { multiAppArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  type MultiAppCliValues,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

const validateArgs = {
  "schema-file": {
    type: "string" as const,
    short: "f",
    description: "Schema file path (default: schema.yaml)",
  },
  app: multiAppArgs.app,
  all: multiAppArgs.all,
  config: multiAppArgs.config,
};

function formatIssue(issue: ValidationIssue): string {
  const icon =
    issue.severity === "error" ? pc.red("\u2717") : pc.yellow("\u26A0");
  const severity =
    issue.severity === "error" ? pc.red("ERROR") : pc.yellow("WARN");
  return `${icon} ${severity} ${pc.dim("[")}${pc.cyan(issue.fieldCode)}${pc.dim("]")} ${pc.dim(`(${issue.fieldType})`)} ${issue.message}`;
}

function printValidationResult(
  result: ValidateSchemaOutput,
  schemaFilePath: string,
): boolean {
  if (result.parseError) {
    p.log.error(
      `${pc.red("Parse error")} in ${pc.cyan(schemaFilePath)}: ${result.parseError}`,
    );
    return false;
  }

  if (!result.validationResult) {
    return true;
  }

  const { issues, isValid } = result.validationResult;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) {
    p.log.success(
      `${pc.cyan(schemaFilePath)}: ${pc.green("Valid")} (${result.fieldCount} fields)`,
    );
    return true;
  }

  const lines = issues.map(formatIssue);
  p.note(lines.join("\n"), `Validation: ${schemaFilePath}`, {
    format: (line) => line,
  });

  const summaryParts = [
    errors.length > 0 ? pc.red(`${errors.length} error(s)`) : null,
    warnings.length > 0 ? pc.yellow(`${warnings.length} warning(s)`) : null,
    pc.dim(`${result.fieldCount} fields`),
  ]
    .filter(Boolean)
    .join(pc.dim("  |  "));

  if (isValid) {
    p.log.warn(`${pc.cyan(schemaFilePath)}: ${summaryParts}`);
  } else {
    p.log.error(`${pc.cyan(schemaFilePath)}: ${summaryParts}`);
  }

  return isValid;
}

async function runValidate(schemaFilePath: string): Promise<boolean> {
  const container = createValidateCliContainer({ schemaFilePath });
  const result = await validateSchema({ container });
  return printValidationResult(result, schemaFilePath);
}

function resolveSchemaFilePath(
  values: MultiAppCliValues,
  appSchemaFile?: string,
): string {
  return (
    values["schema-file"] ??
    process.env.SCHEMA_FILE_PATH ??
    appSchemaFile ??
    "schema.yaml"
  );
}

export default define({
  name: "validate",
  description: "Validate schema file without connecting to kintone",
  args: validateArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as MultiAppCliValues;
      await routeMultiApp(values, {
        singleLegacy: async () => {
          const valid = await runValidate(resolveSchemaFilePath(values));
          if (!valid) {
            p.outro("Validation failed.");
            process.exit(1);
          }
          p.outro("Validation passed.");
        },
        singleApp: async (app) => {
          const valid = await runValidate(
            resolveSchemaFilePath(values, app.schemaFile),
          );
          if (!valid) {
            p.outro("Validation failed.");
            process.exit(1);
          }
          p.outro("Validation passed.");
        },
        multiApp: async (plan) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              const schemaFilePath = resolveSchemaFilePath(
                values,
                app.schemaFile,
              );
              const container = createValidateCliContainer({ schemaFilePath });
              const result = await validateSchema({ container });
              const valid = printValidationResult(result, schemaFilePath);
              if (!valid) {
                throw new ValidationError(
                  ValidationErrorCode.InvalidInput,
                  `Validation failed for app "${app.name}"`,
                );
              }
            },
            "All validations passed.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
