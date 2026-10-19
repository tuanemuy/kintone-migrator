import ts from "typescript";

export type EnvAccess = {
  /** Variable names read as `env.NAME` or `env["NAME"]`. */
  names: ReadonlySet<string>;
  /** Locations that use the env object without naming a variable statically. */
  unnamed: readonly string[];
};

/**
 * - `env`: the env object itself (`NodeJS.ProcessEnv`)
 * - `carrier`: a value whose `env` property is the env object, such as
 *   `process` or a `node:process` namespace import
 */
type TrackedKind = "env" | "carrier";

type Use =
  | { kind: "named"; name: string }
  | { kind: "tracked" }
  | { kind: "unnamed" };

function isProcessEnvType(type: ts.Type): boolean {
  return type.getSymbol()?.getName() === "ProcessEnv";
}

function trackedKindOf(
  checker: ts.TypeChecker,
  node: ts.Node,
): TrackedKind | undefined {
  const type = checker.getTypeAtLocation(node);
  if (isProcessEnvType(type)) return "env";
  const env = type.getProperty("env");
  if (
    env !== undefined &&
    isProcessEnvType(checker.getTypeOfSymbolAtLocation(env, node))
  ) {
    return "carrier";
  }
  return undefined;
}

// Identifiers that name a declaration or a property, rather than referring to
// a value. A shorthand property (`{ env }`) refers to the value it copies.
function isNameSite(checker: ts.TypeChecker, node: ts.Identifier): boolean {
  const { parent } = node;
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  if (ts.isPropertyAccessExpression(parent)) return parent.name === node;
  const declarations = checker.getSymbolAtLocation(node)?.declarations ?? [];
  return declarations.some(
    (declaration) => ts.getNameOfDeclaration(declaration) === node,
  );
}

function isInTypePosition(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
  }
  return false;
}

function isValueReference(checker: ts.TypeChecker, node: ts.Node): boolean {
  if (ts.isIdentifier(node)) {
    return !isNameSite(checker, node) && !isInTypePosition(node);
  }
  return (
    (ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)) &&
    !isInTypePosition(node)
  );
}

// The key a destructuring element or object literal property names, or
// `undefined` when it is not known statically.
function propertyKeyOf(
  name: ts.PropertyName | ts.BindingName | undefined,
): string | undefined {
  return name !== undefined &&
    (ts.isIdentifier(name) || ts.isStringLiteralLike(name))
    ? name.text
    : undefined;
}

// `const { env } = process` keeps tracking only when every element is a
// plain property and the one taking `env` still holds the env object.
function isTrackedDestructuring(
  checker: ts.TypeChecker,
  pattern: ts.ObjectBindingPattern,
): boolean {
  return pattern.elements.every((element) => {
    if (element.dotDotDotToken !== undefined) return false;
    const property = propertyKeyOf(element.propertyName ?? element.name);
    if (property === undefined) return false;
    if (property !== "env") return true;
    return (
      ts.isIdentifier(element.name) &&
      trackedKindOf(checker, element.name) === "env"
    );
  });
}

// Reading a property of `process` is followed through the result; reading
// one of the env object names the variable.
function accessUse(
  kind: TrackedKind,
  access: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  name: string,
): Use {
  if (kind === "carrier") return { kind: "tracked" };
  return access.questionDotToken === undefined
    ? { kind: "named", name }
    : { kind: "unnamed" };
}

// An alias is followed where it is used, as long as it keeps the same kind of
// type.
function declarationUse(
  checker: ts.TypeChecker,
  declaration: ts.VariableDeclaration,
  kind: TrackedKind,
): Use {
  if (ts.isIdentifier(declaration.name)) {
    return trackedKindOf(checker, declaration.name) === kind
      ? { kind: "tracked" }
      : { kind: "unnamed" };
  }
  if (kind === "carrier" && ts.isObjectBindingPattern(declaration.name)) {
    return isTrackedDestructuring(checker, declaration.name)
      ? { kind: "tracked" }
      : { kind: "unnamed" };
  }
  return { kind: "unnamed" };
}

// Any use other than an access with a static name or an alias that keeps the
// type loses track of which variables are read.
function classifyUse(
  checker: ts.TypeChecker,
  node: ts.Node,
  kind: TrackedKind,
): Use {
  const { parent } = node;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
    return accessUse(kind, parent, parent.name.text);
  }
  if (ts.isElementAccessExpression(parent) && parent.expression === node) {
    return ts.isStringLiteralLike(parent.argumentExpression)
      ? accessUse(kind, parent, parent.argumentExpression.text)
      : { kind: "unnamed" };
  }
  if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
    return declarationUse(checker, parent, kind);
  }
  return { kind: "unnamed" };
}

// The object an `.env` / `["env"]` access reads from.
function envOwnerOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isPropertyAccessExpression(node) && node.name.text === "env") {
    return node.expression;
  }
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    node.argumentExpression.text === "env"
  ) {
    return node.expression;
  }
  return undefined;
}

function mayTakeEnv(keys: readonly (string | undefined)[]): boolean {
  return keys.some((key) => key === undefined || key === "env");
}

// The value that `env` may be taken from: the owner of `.env` / `["env"]`, or
// the source of a destructuring that names `env` or a key not known statically
// (`const { env } = v`, `function f({ env }: T)`, `({ env } = v)`).
function envSourceOf(node: ts.Node): ts.Node | undefined {
  if (ts.isObjectBindingPattern(node)) {
    const keys = node.elements
      .filter((element) => element.dotDotDotToken === undefined)
      .map((element) => propertyKeyOf(element.propertyName ?? element.name));
    return mayTakeEnv(keys) ? node : undefined;
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isObjectLiteralExpression(node.left)
  ) {
    const keys = node.left.properties.flatMap((property) =>
      ts.isSpreadAssignment(property) ? [] : [propertyKeyOf(property.name)],
    );
    return mayTakeEnv(keys) ? node.right : undefined;
  }
  return envOwnerOf(node);
}

// `env` taken from an untyped (`any`) value, such as
// `require("node:process").env` or `const { env } = require("node:process")`,
// cannot be followed by type.
function isEnvOfUntyped(checker: ts.TypeChecker, node: ts.Node): boolean {
  const source = envSourceOf(node);
  return (
    source !== undefined &&
    (checker.getTypeAtLocation(source).flags & ts.TypeFlags.Any) !== 0
  );
}

function useOf(checker: ts.TypeChecker, node: ts.Node): Use | undefined {
  if (isEnvOfUntyped(checker, node)) return { kind: "unnamed" };
  const kind = isValueReference(checker, node)
    ? trackedKindOf(checker, node)
    : undefined;
  return kind === undefined ? undefined : classifyUse(checker, node, kind);
}

/**
 * Collects how the given files read `process.env`. The env object is followed
 * by its type through aliases, destructuring and `node:process` imports. A use
 * that does not keep that type (a widening annotation, a call argument, a
 * spread, a dynamic key, optional chaining) is reported as unnamed, and so is
 * `.env` taken from an `any` value.
 */
export function collectEnvAccess(
  program: ts.Program,
  fileNames: readonly string[],
): EnvAccess {
  const checker = program.getTypeChecker();
  const names = new Set<string>();
  const unnamed: string[] = [];

  for (const fileName of fileNames) {
    const sourceFile = program.getSourceFile(fileName);
    if (sourceFile === undefined) {
      throw new Error(`Source file not found in program: ${fileName}`);
    }
    const visit = (node: ts.Node): void => {
      const use = useOf(checker, node);
      if (use?.kind === "named") {
        names.add(use.name);
      } else if (use?.kind === "unnamed") {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        unnamed.push(`${fileName}:${line + 1}: ${node.parent.getText()}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return { names, unnamed };
}
