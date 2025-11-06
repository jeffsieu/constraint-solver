import { z } from "zod";

// Zod schemas for form validation
export const attributeGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  attributes: z.array(z.string()),
});

export const recordSchema = z.object({
  id: z.string(),
  value: z.number(),
  attributes: z.array(z.string()),
});

export const simpleRequirementSchema = z.object({
  id: z.string(),
  type: z.literal("simple"),
  constraint: z.enum(["minimum", "maximum"]),
  value: z.number(),
  attributes: z.array(z.string()),
});

export const complexRequirementSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal("complex"),
    operator: z.enum(["AND", "OR"]),
    children: z.array(
      z.union([simpleRequirementSchema, complexRequirementSchema])
    ),
  })
);

export const requirementSchema = z.union([
  simpleRequirementSchema,
  complexRequirementSchema,
]);

export const solverFormSchema = z.object({
  globalUnit: z.enum(["hours", "occurrences"]),
  attributeGroups: z.array(attributeGroupSchema),
  targetValue: z.number(),
  records: z.array(recordSchema),
  requirements: requirementSchema,
});

export type SolverFormSchema = z.infer<typeof solverFormSchema>;
