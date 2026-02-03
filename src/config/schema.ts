import { z } from 'zod';

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
    .optional()
});

export type RepoConfig = z.infer<typeof RepoConfigSchema>;
