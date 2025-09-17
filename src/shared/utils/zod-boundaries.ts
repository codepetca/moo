import { z, ZodError } from "zod";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string; details?: ZodError };

export function safeParse<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const r = schema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: formatZodError(r.error), details: r.error };
}

export function safeParseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new Error(formatZodError(r.error));
  return r.data;
}

export const asEnum = <T extends readonly string[]>(values: T) => z.enum(values as unknown as [T[number], ...T[number][]]);

export const coerceDateMs = z.preprocess((v) => {
  if (v instanceof Date) return v.getTime();
  const n = typeof v === "string" ? Date.parse(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}, z.number().int().nonnegative());

export function formatZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}