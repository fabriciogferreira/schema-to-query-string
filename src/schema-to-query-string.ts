//* Libraries imports
import { z, ZodArray, ZodObject, ZodTypeAny } from "zod";

const unwrapNullable = (schema: ZodTypeAny): ZodTypeAny => {
  return schema instanceof z.ZodNullable
    /** @ts-expect-error */
    ? schema.unwrap()
    : schema;
};

export const schemaToQueryString = (
  schema: ZodObject,
  rootResource: string,
	includeKey: string = "include",
	fieldsKey: string = "fields"
) => {
  const fields: Record<string, string[]> = {};
  const includes = new Set<string>();

  fields[rootResource] = [];

  const walk = (
    currentSchema: ZodObject,
    resourcePath: string | null
  ) => {
    const currentFieldsKey = resourcePath ?? rootResource;

    if (!fields[currentFieldsKey]) {
      fields[currentFieldsKey] = [];
    }

    for (const key in currentSchema.shape) {
      const rawField = currentSchema.shape[key] as ZodTypeAny;
      const field = unwrapNullable(rawField);

      // OBJETO
      if (field instanceof ZodObject) {
        const nextPath = resourcePath
          ? `${resourcePath}.${key}`
          : key;

        includes.add(nextPath);
        walk(field, nextPath);
        continue;
      }

      // ARRAY
      if (field instanceof ZodArray) {
        /** @ts-expect-error */
        const element = unwrapNullable(field.element);

        const nextPath = resourcePath
          ? `${resourcePath}.${key}`
          : key;

        includes.add(nextPath);

        if (element instanceof ZodObject) {
          walk(element, nextPath);
        }

        continue;
      }

      // CAMPO SIMPLES
      fields[currentFieldsKey].push(key);
    }
  };

  walk(schema, null);

  const queryParts: string[] = [];

	for (const resource in fields) {
    if (fields[resource].length > 0) {
      queryParts.push(
        `${fieldsKey}[${resource}]=${fields[resource].join(",")}`
      );
    }
  }

  if (includes.size) {
    queryParts.push(
      `${includeKey}=${Array.from(includes).join(",")}`
    );
  }

  return "?" + queryParts.join("&");
};
