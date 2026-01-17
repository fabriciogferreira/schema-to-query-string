//* Libraries imports
import { ZodArray, ZodNullable, ZodObject } from "zod/v4";

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
      let rawField = currentSchema.shape[key];
      
			if (rawField instanceof ZodNullable) {
				rawField = rawField.unwrap()
			}
      
			if (rawField instanceof ZodObject || rawField instanceof ZodArray) {
				let nextPath = resourcePath
					? `${resourcePath}.${key}`
					: key;

        includes.add(nextPath);
				
				// ARRAY
				if (rawField instanceof ZodArray) {
					rawField = rawField.unwrap()
				}
				
				// OBJETO
				if (rawField instanceof ZodObject) {
					walk(rawField, nextPath);
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
