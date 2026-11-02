import {
  type AnyRelatedApp,
  type FieldCode,
  type FieldDefinition,
  isLookupCapableField,
  type Lookup,
  type RelatedApp,
  type RemoteFieldDefinition,
  type RemoteRelatedApp,
} from "../valueObject";

type ReplaceRelatedApp<A extends AnyRelatedApp, B extends AnyRelatedApp> = (
  relatedApp: A,
  fieldCode: FieldCode,
) => B;

function mapLookupProperties<
  A extends AnyRelatedApp,
  B extends AnyRelatedApp,
  P extends Readonly<{ lookup?: Lookup<A> }>,
>(
  properties: P,
  fieldCode: FieldCode,
  replace: ReplaceRelatedApp<A, B>,
): Omit<P, "lookup"> & Readonly<{ lookup?: Lookup<B> }> {
  const { lookup, ...rest } = properties;
  if (lookup === undefined) return rest;
  return {
    ...rest,
    lookup: { ...lookup, relatedApp: replace(lookup.relatedApp, fieldCode) },
  };
}

/**
 * Rebuilds `field` with each related app replaced by `replace`, including those
 * of the fields inside a subtable.
 */
function mapFieldRelatedApps<A extends AnyRelatedApp, B extends AnyRelatedApp>(
  field: FieldDefinition<A>,
  replace: ReplaceRelatedApp<A, B>,
): FieldDefinition<B> {
  switch (field.type) {
    case "SINGLE_LINE_TEXT":
      return {
        ...field,
        properties: mapLookupProperties(field.properties, field.code, replace),
      };
    case "NUMBER":
      return {
        ...field,
        properties: mapLookupProperties(field.properties, field.code, replace),
      };
    case "LINK":
      return {
        ...field,
        properties: mapLookupProperties(field.properties, field.code, replace),
      };
    case "REFERENCE_TABLE": {
      const { referenceTable } = field.properties;
      return {
        ...field,
        properties: {
          referenceTable: {
            ...referenceTable,
            relatedApp: replace(referenceTable.relatedApp, field.code),
          },
        },
      };
    }
    case "SUBTABLE":
      return {
        ...field,
        properties: {
          fields: mapFieldsRelatedApps(field.properties.fields, replace),
        },
      };
    default:
      return field;
  }
}

/** Rebuilds `fields` with each related app replaced by `replace`. */
export function mapFieldsRelatedApps<
  A extends AnyRelatedApp,
  B extends AnyRelatedApp,
>(
  fields: ReadonlyMap<FieldCode, FieldDefinition<A>>,
  replace: ReplaceRelatedApp<A, B>,
): ReadonlyMap<FieldCode, FieldDefinition<B>> {
  return new Map(
    Array.from(fields, ([code, field]) => [
      code,
      mapFieldRelatedApps(field, replace),
    ]),
  );
}

function relatedAppOf<R extends AnyRelatedApp>(
  field: FieldDefinition<R>,
): R | undefined {
  if (isLookupCapableField(field)) return field.properties.lookup?.relatedApp;
  return field.type === "REFERENCE_TABLE"
    ? field.properties.referenceTable.relatedApp
    : undefined;
}

/**
 * The related app of each field that has one, keyed by field code. A schema
 * and a remote field map both hold subtable inner fields at the top level too,
 * and field codes are unique across the form, so the top level covers them.
 */
function relatedAppsByField<R extends AnyRelatedApp>(
  fields: ReadonlyMap<FieldCode, FieldDefinition<R>>,
): ReadonlyMap<FieldCode, R> {
  const result = new Map<FieldCode, R>();
  for (const [code, field] of fields) {
    const relatedApp = relatedAppOf(field);
    if (relatedApp !== undefined) result.set(code, relatedApp);
  }
  return result;
}

/**
 * Refers to the remote related app the way `reference` does: by app code when
 * `reference` does and the app has one, by app ID otherwise.
 */
function projectRelatedApp(
  remote: RemoteRelatedApp,
  reference: RelatedApp | undefined,
): RelatedApp {
  return reference?.code !== undefined && remote.code !== ""
    ? { code: remote.code }
    : { app: remote.app };
}

/** Whether `relatedApp` refers to the app `remote` reports. */
function refersTo(relatedApp: RelatedApp, remote: RemoteRelatedApp): boolean {
  return relatedApp.code !== undefined
    ? relatedApp.code === remote.code
    : relatedApp.app === remote.app;
}

/**
 * Turns the remote fields into schema fields, referring to each related app the
 * way the same-code field of `reference` does (see {@link projectRelatedApp}).
 * Without a `reference`, every related app is referred to by app ID.
 */
export function projectRemoteFields(
  remote: ReadonlyMap<FieldCode, RemoteFieldDefinition>,
  reference: ReadonlyMap<FieldCode, FieldDefinition> | undefined,
): ReadonlyMap<FieldCode, FieldDefinition> {
  const referenceApps =
    reference === undefined ? new Map() : relatedAppsByField(reference);
  return mapFieldsRelatedApps(remote, (relatedApp, code) =>
    projectRelatedApp(relatedApp, referenceApps.get(code)),
  );
}

/**
 * Restates the base fields the way {@link projectRemoteFields} states the remote
 * ones, so that a base and a remote referring to the same app compare equal
 * however each was written. A base related app that does not refer to the app
 * of the same-code remote field is a real difference and stays as it is.
 */
export function restateBaseFields(
  base: ReadonlyMap<FieldCode, FieldDefinition>,
  remote: ReadonlyMap<FieldCode, RemoteFieldDefinition>,
  reference: ReadonlyMap<FieldCode, FieldDefinition> | undefined,
): ReadonlyMap<FieldCode, FieldDefinition> {
  const remoteApps = relatedAppsByField(remote);
  const referenceApps =
    reference === undefined ? new Map() : relatedAppsByField(reference);
  return mapFieldsRelatedApps(base, (relatedApp, code) => {
    const remoteApp = remoteApps.get(code);
    return remoteApp !== undefined && refersTo(relatedApp, remoteApp)
      ? projectRelatedApp(remoteApp, referenceApps.get(code))
      : relatedApp;
  });
}
