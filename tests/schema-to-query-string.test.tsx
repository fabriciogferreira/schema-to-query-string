//* Libraries imports
import { it, expect } from "bun:test";
import z, { ZodObject, ZodType } from "zod/v4";
import fastCartesian from "fast-cartesian";
import { PowerSet } from 'js-combinatorics';

//* Utils imports
import { schemaToQueryString } from "../src";

const partialObjects: [object, string][] = [
	[
		{
			rootOne: z.string(),
		},
		"fields[root]=rootOne"
	],
	[
		{
			rootTwo: z.string(),
		},
		"fields[root]=rootTwo"
	],
	[
		{
			rootObject: z.object({
				subOne: z.number(),
			}),
		},
		"fields[rootObject]=subOne&include=rootObject"
	],
	[
		{
			rootObject: z.object({
				subTwo: z.number(),
			}),
		},
		"fields[rootObject]=subTwo&include=rootObject"
	],
	[
		{
			rootNullableObject: z.object({
				subOne: z.number(),
			}).nullable(),
		},
		"fields[rootNullableObject]=subOne&include=rootNullableObject"
	],
	[
		{
			rootNullableObject: z.object({
				subTwo: z.number(),
			}).nullable(),
		},
		"fields[rootNullableObject]=subTwo&include=rootNullableObject"
	],
	[
		{
			rootArrayObject: z.object({
				subOne: z.number(),
			}).array(),
		},
		"fields[rootArrayObject]=subOne&include=rootArrayObject"
	],
	[
		{
			rootArrayObject: z.object({
				subTwo: z.number(),
			}).array(),
		},
		"fields[rootArrayObject]=subTwo&include=rootArrayObject"
	],
];

function unwrapObject(schema: ZodType): ZodObject<any> | null {
  if (schema instanceof z.ZodObject) {
    return schema
  }

  if (schema instanceof z.ZodNullable) {
    const inner = schema.unwrap()
    return inner instanceof z.ZodObject ? inner : null
  }

	if (schema instanceof z.ZodArray) {
    const inner = schema.unwrap()
    return inner instanceof z.ZodObject ? inner : null
	}

  return null
}

function isNullable(schema: ZodType): boolean {
  return schema instanceof z.ZodNullable
}

function deepExtendZod(
  base: ZodObject<any>,
  extension: Record<string, ZodType>
): ZodObject<any> {
  const newShape: Record<string, ZodType> = { ...base.shape }

  for (const key in extension) {
    const baseField = newShape[key]
    const extField = extension[key]

    const baseObj = baseField ? unwrapObject(baseField) : null
    const extObj = unwrapObject(extField)

    if (baseObj && extObj) {
      const merged = deepExtendZod(baseObj, extObj.shape)

      const shouldBeNullable =
        isNullable(baseField!) || isNullable(extField)

      newShape[key] = shouldBeNullable
        ? merged.nullable()
        : merged
    } else {
      newShape[key] = extField
    }
  }

  return z.object(newShape)
}

const schemaCombinations = [...new PowerSet(partialObjects)]

const schemaCases: [ZodObject, string][] = schemaCombinations.map((objects) => {
	let schema = z.object({})
	let fields: Record<string, Set<string>> = {}
	let includes = new Set<string>([])
	let expectedQueryString = ''

	objects.forEach(([object, queryString]) => {
		//@ts-expect-error
		schema = deepExtendZod(schema, object)

		const params = queryString.split("&")

		params.forEach((param) => {
			const [key, values] = param.split("=")

			if (key.startsWith("include")) {
				values.split(',').map(value => includes.add(value))
			}

			if (key.startsWith("fields")) {
				if (!(key in fields)) fields[key] = new Set([])

				values.split(',').map(value => fields[key].add(value))
			}
		})
	});

	let includeValues = Array.from(includes).join(',')
	let includeQueryString = includeValues ? `include=${Array.from(includes).join(',')}` : ''
	let filtersQueryString = Object.entries(fields).map(([key, values]) => `${key}=${Array.from(values).join(',')}`).join('&')
	expectedQueryString = '?' + [filtersQueryString, includeQueryString].filter(Boolean).join('&')

	return [schema, expectedQueryString]
});

const objectNameCases = fastCartesian([
	// ["fields"],
	["fields", "alternativeKeyForFields"],
	// [undefined, "", "fields", "alternativeKeyForFields"],
	// ["include"],
	["include", "alternativeKeyForInclude"],
	// [undefined, "", "include", "alternativeKeyForInclude"],
]);

const combinations = fastCartesian([
	objectNameCases,
	schemaCases
])

const cases: [string, string, string, string, ZodObject][] = combinations.map(([config, [schema, expectedQueryString]]) => {
	const fieldKey = config[0] === "" ? "vazio" : config[0] === undefined ? "undefined" : config[0]
	const includeKey = config[1] === "" ? "vazio" : config[1] === undefined ? "undefined" : config[1]

	return [`${fieldKey},${includeKey}`, expectedQueryString, fieldKey, includeKey, schema]
})

it.each(cases)("when config is %s and should %s", (_, expected, fieldKey, includeKey, schema) => {
	expected = expected.replace("include", includeKey)
	expected = expected.replaceAll("fields", fieldKey)
	const received = schemaToQueryString(schema, "root", includeKey, fieldKey)
	// console.log("======================================================================================================")
	// console.log(received, expected)
	expect(received).toBe(expected)
})
