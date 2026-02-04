import { z } from 'zod';

export const StageConfigSchema = z
  .object({
    engine: z.enum(['codex', 'claude']).optional(),
    model: z.string().min(1).optional(),
    reasoning: z.enum(['low', 'medium', 'high']).optional(),
    sandbox: z.boolean().optional(),
    askForApproval: z.boolean().optional(),
    profile: z.string().min(1).optional(),
    configOverrides: z.record(z.string(), z.string()).optional()
  })
  .strict();

export const RepoConfigSchema = z.object({
  schemaVersion: z.literal('0.1').default('0.1'),
  commands: z
    .object({
      test: z.string().min(1).optional(),
      lint: z.string().min(1).optional(),
      build: z.string().min(1).optional()
    })
    .optional(),
  boundaries: z
    .object({
      neverTouch: z.array(z.string().min(1)).optional()
    })
    .optional(),
  defaults: z
    .object({
      sandbox: z.boolean().optional(),
      askForApproval: z.boolean().optional()
    })
    .optional(),
  stages: z
    .object({
      work: StageConfigSchema.optional(),
      plan: StageConfigSchema.optional(),
      review: StageConfigSchema.optional()
    })
    .optional()
});

export type StageConfig = z.infer<typeof StageConfigSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;
