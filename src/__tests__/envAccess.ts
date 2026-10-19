import ts from "typescript";

export type EnvAccess = {
  /** Variable names read as `env.NAME` or `env["NAME"]`. */
  names: ReadonlySet<string>;
  /** Locations that use the env object without naming a variable statically. */
  unnamed: readonly string[];
};

function isProcessEnv(checker: ts.TypeChecker, node: ts.Node): boolean {
  return (
    checker.getTypeAtLocation(node).getSymbol()?.getName() === "ProcessEnv"
  );
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

// `const e = process.env` passes the env object on to `e`, whose reads are
// collected where `e` is used.
function isAliasInitializer(node: ts.Node): boolean {
  const { parent } = node;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name)
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

function readVariableName(node: ts.Node): string | undefined {
  const { parent } = node;
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.expression === node &&
    parent.questionDotToken === undefined
  ) {
    return parent.name.text;
  }
  if (
    ts.isElementAccessExpression(parent) &&
    parent.expression === node &&
    parent.questionDotToken === undefined &&
    ts.isStringLiteralLike(parent.argumentExpression)
  ) {
    return parent.argumentExpression.text;
  }
  return undefined;
}

/**
 * Collects how the given files read `process.env`, following the env object
 * by its type (`NodeJS.ProcessEnv`) so that aliases, destructuring and
 * `node:process` imports are covered.
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
      if (
        isValueReference(checker, node) &&
        !isAliasInitializer(node) &&
        isProcessEnv(checker, node)
      ) {
        const name = readVariableName(node);
        if (name === undefined) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          );
          unnamed.push(`${fileName}:${line + 1}: ${node.parent.getText()}`);
        } else {
          names.add(name);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return { names, unnamed };
}
