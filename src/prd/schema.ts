import { z } from 'zod';

export const StorySizeSchema = z.enum(['S', 'M', 'L', 'XL']);

export const StorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  size: StorySizeSchema,
  acceptance: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).optional()
});

export const PrdSchemaV01 = z.object({
  schemaVersion: z.literal('0.1'),
  title: z.string().min(1),
  repo: z
    .object({
      name: z.string().min(1).optional(),
      path: z.string().min(1).optional()
    })
    .optional(),
  principles: z.array(z.string().min(1)).optional(),
  stories: z.array(StorySchema).min(1)
});

export type PrdV01 = z.infer<typeof PrdSchemaV01>;
export type StoryV01 = z.infer<typeof StorySchema>;
export type StorySize = z.infer<typeof StorySizeSchema>;
