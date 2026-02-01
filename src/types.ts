import { ZodObject } from "zod/v4"

export type schemaParam = ZodObject
export type rootResourceParam = string
export type includeParam = string
export type fieldsParam = string

export type SchemaToQueryStringConfig = {
	schema: schemaParam,
	rootResource: rootResourceParam,
	includeKey?: includeParam,
	fieldsKey?: fieldsParam,
}