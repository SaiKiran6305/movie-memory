import { z } from "zod";
export const factResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.enum(["fresh", "cached", "stale-fallback"]), fact: z.string().min(1), createdAt: z.string().datetime() }),
  z.object({ status: z.literal("generating"), retryAfterMs: z.number().int().positive() }),
]);
export type FactResponse = z.infer<typeof factResponseSchema>;
