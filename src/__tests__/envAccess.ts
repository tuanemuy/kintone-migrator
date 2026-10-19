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

function isAny(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Any) !== 0;
}

// Whether a destructuring names `env` or a key not known statically. A rest
// element (`...rest`) takes only the keys not named elsewhere.
function mayTakeEnv(
  pattern: ts.ObjectBindingPattern | ts.ObjectLiteralExpression,
): boolean {
  const keys = ts.isObjectBindingPattern(pattern)
    ? pattern.elements
        .filter((element) => element.dotDotDotToken === undefined)
        .map((element) => propertyKeyOf(element.propertyName ?? element.name))
    : pattern.properties.flatMap((property) =>
        ts.isSpreadAssignment(property) ? [] : [propertyKeyOf(property.name)],
      );
  return keys.some((key) => key === undefined || key === "env");
}

function isAssignment(node: ts.Node): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.EqualsToken
  );
}

// Whether `node` receives a value by destructuring assignment: the left side
// of `=` (including an element with a default, `{ a: target = fallback }`),
// the head of `for (target of values)`, or an element of such a target.
function isAssignmentTarget(node: ts.Node): boolean {
  const { parent } = node;
  if (isAssignment(parent)) return parent.left === node;
  if (ts.isForOfStatement(parent)) return parent.initializer === node;
  if (ts.isPropertyAssignment(parent)) return isAssignmentTarget(parent.parent);
  if (ts.isArrayLiteralExpression(parent) || ts.isSpreadElement(parent)) {
    return isAssignmentTarget(parent);
  }
  return false;
}

function concatTypes(
  lists: readonly (readonly ts.Type[] | undefined)[],
): readonly ts.Type[] | undefined {
  return lists.every((list): list is readonly ts.Type[] => list !== undefined)
    ? lists.flat()
    : undefined;
}

// The types the member `key` of a `type` value may have, or `undefined` when
// they cannot be determined. A key not known statically may take any member.
// `absent` is the result for a key that is neither a property nor covered by
// an index signature: a missing object property holds nothing, while an
// element of an iterable that is not array-like cannot be followed.
function memberTypes(
  checker: ts.TypeChecker,
  type: ts.Type,
  key: string | undefined,
  absent: readonly ts.Type[] | undefined,
): readonly ts.Type[] | undefined {
  const value = checker.getNonNullableType(type);
  if (isAny(value)) return [value];
  if (value.isUnion()) {
    return concatTypes(
      value.types.map((member) => memberTypes(checker, member, key, absent)),
    );
  }
  const property = key === undefined ? undefined : value.getProperty(key);
  if (property !== undefined) return [checker.getTypeOfSymbol(property)];
  const indexTypes = checker
    .getIndexInfosOfType(value)
    .map((info) => info.type);
  if (key === undefined) {
    return [
      ...checker
        .getPropertiesOfType(value)
        .map((member) => checker.getTypeOfSymbol(member)),
      ...indexTypes,
    ];
  }
  return indexTypes.length > 0 ? indexTypes : absent;
}

function memberTypesOf(
  checker: ts.TypeChecker,
  container: ts.Node,
  key: string | undefined,
  absent: readonly ts.Type[] | undefined,
): readonly ts.Type[] | undefined {
  const containerTypes = receivedTypes(checker, container);
  return (
    containerTypes &&
    concatTypes(
      containerTypes.map((type) => memberTypes(checker, type, key, absent)),
    )
  );
}

function propertyTypesOf(
  checker: ts.TypeChecker,
  container: ts.Node,
  name: ts.PropertyName | ts.BindingName,
): readonly ts.Type[] | undefined {
  return memberTypesOf(checker, container, propertyKeyOf(name), []);
}

function elementTypesOf(
  checker: ts.TypeChecker,
  container: ts.Node,
  index: number,
): readonly ts.Type[] | undefined {
  return memberTypesOf(checker, container, String(index), undefined);
}

function typesOf(
  checker: ts.TypeChecker,
  node: ts.Expression | undefined,
): readonly ts.Type[] {
  return node === undefined ? [] : [checker.getTypeAtLocation(node)];
}

// A rest element (`...rest`) is not followed.
function bindingElementTypes(
  checker: ts.TypeChecker,
  element: ts.BindingElement,
): readonly ts.Type[] | undefined {
  const container = element.parent;
  if (element.dotDotDotToken !== undefined) return undefined;
  return ts.isObjectBindingPattern(container)
    ? propertyTypesOf(checker, container, element.propertyName ?? element.name)
    : elementTypesOf(checker, container, container.elements.indexOf(element));
}

// The types of the values a destructuring target may receive, or `undefined`
// when they cannot be determined statically. The value written after `=` (an
// initializer, a default or the right side of an assignment) is followed
// position by position, alongside the type TypeScript gives a declaration or
// parameter, which comes from its annotation or context when there is one. An
// element with a default receives either the destructured value or the
// default. `getTypeOfAssignmentPattern` is not used past the head of
// `for ... of` because it gives only the default's type for such an element.
function receivedTypes(
  checker: ts.TypeChecker,
  target: ts.Node,
): readonly ts.Type[] | undefined {
  const { parent } = target;
  if (ts.isVariableDeclaration(parent) || ts.isParameter(parent)) {
    return [
      checker.getTypeAtLocation(target),
      ...typesOf(checker, parent.initializer),
    ];
  }
  if (ts.isBindingElement(parent)) {
    return concatTypes([
      bindingElementTypes(checker, parent),
      typesOf(checker, parent.initializer),
    ]);
  }
  if (isAssignment(parent)) {
    const right = typesOf(checker, parent.right);
    return isAssignmentTarget(parent)
      ? concatTypes([receivedTypes(checker, parent), right])
      : right;
  }
  if (
    ts.isForOfStatement(parent) &&
    (ts.isObjectLiteralExpression(target) ||
      ts.isArrayLiteralExpression(target))
  ) {
    return [checker.getTypeOfAssignmentPattern(target)];
  }
  if (ts.isPropertyAssignment(parent)) {
    return propertyTypesOf(checker, parent.parent, parent.name);
  }
  if (ts.isArrayLiteralExpression(parent) && ts.isExpression(target)) {
    return elementTypesOf(checker, parent, parent.elements.indexOf(target));
  }
  return undefined;
}

// A destructuring target whose value types cannot be determined counts as
// untyped, so the guard fails rather than misses it.
function receivesUntyped(checker: ts.TypeChecker, target: ts.Node): boolean {
  const types = receivedTypes(checker, target);
  return types === undefined || types.some(isAny);
}

// `env` taken from an untyped (`any`) value cannot be followed by type:
// `.env` / `["env"]` of such a value (`require("node:process").env`), or a
// destructuring of such a value that names `env` or a key not known
// statically (`const { env } = require("node:process")`,
// `({ a: { env } } = v)`, `for ({ env } of values)`).
function isEnvOfUntyped(checker: ts.TypeChecker, node: ts.Node): boolean {
  if (
    ts.isObjectBindingPattern(node) ||
    (ts.isObjectLiteralExpression(node) && isAssignmentTarget(node))
  ) {
    return mayTakeEnv(node) && receivesUntyped(checker, node);
  }
  const owner = envOwnerOf(node);
  return owner !== undefined && isAny(checker.getTypeAtLocation(owner));
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
 * `env` taken from an `any` value by access or destructuring.
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
