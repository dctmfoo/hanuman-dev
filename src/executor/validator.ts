import { PrdSchemaV01, type PrdV01 } from '../prd/schema.js';

export type ValidationResult =
  | { ok: true; prd: PrdV01 }
  | { ok: false; error: string };

export function validatePrdConservative(raw: unknown): ValidationResult {
  const parsed = PrdSchemaV01.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.toString() };
  }

  const prd = parsed.data;

  if (prd.stories.length > 10) {
    return { ok: false, error: `Too many stories for v0.1 (max 10). Got ${prd.stories.length}.` };
  }

  const tooBig = prd.stories.filter((s) => s.size === 'L' || s.size === 'XL');
  if (tooBig.length) {
    return {
      ok: false,
      error: `v0.1 only allows S/M stories. Too large: ${tooBig.map((s) => `${s.id}:${s.size}`).join(', ')}`
    };
  }

  return { ok: true, prd };
}
