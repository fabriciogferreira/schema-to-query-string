import z4 from "zod/v4";

export const schemaForTest = z4.object({
	rootOne: z4.string(),
	rootTwo: z4.string(),
	rootObject: z4.object({
		subOne: z4.number(),
		subTwo: z4.number(),
	}),
	rootNullableObject: z4.object({
		subOne: z4.number(),
		subTwo: z4.number(),
	}).nullable(),
	rootArrayObject: z4.object({
		subOne: z4.number(),
		subTwo: z4.number(),
	}).array(),
});

export const expectedStringForTest = "fields[root]=rootOne,rootTwo&fields[rootObject]=subOne,subTwo&fields[rootNullableObject]=subOne,subTwo&fields[rootArrayObject]=subOne,subTwo&include=rootObject,rootNullableObject,rootArrayObject"
export const expectedQueryStringForTest = "?" + expectedStringForTest;