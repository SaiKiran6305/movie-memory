import type { PrismaClient } from "@prisma/client";

// Count attempts before calling the provider, including failed or abandoned calls.
// One lock order (global, then user) serializes reservations across app instances.
export async function reserveGeneration(db: PrismaClient, userId: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const scopes = ["global", `user:${userId}`];
    for (const scope of scopes) {
      await tx.$executeRaw`
        INSERT INTO "GenerationBudget" (scope, day, attempts)
        VALUES (${scope}, (clock_timestamp() AT TIME ZONE 'UTC')::date, 0)
        ON CONFLICT (scope) DO NOTHING`;
      await tx.$queryRaw`SELECT scope FROM "GenerationBudget" WHERE scope = ${scope} FOR UPDATE`;
      await tx.$executeRaw`
        UPDATE "GenerationBudget" SET day = (clock_timestamp() AT TIME ZONE 'UTC')::date, attempts = 0
        WHERE scope = ${scope} AND day < (clock_timestamp() AT TIME ZONE 'UTC')::date`;
    }
    const rows = await tx.$queryRaw<{ scope: string; attempts: number; cooldown: number; reset: number }[]>`
      SELECT scope, attempts,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("lastAttempt" + interval '10 seconds' - clock_timestamp()))))::int AS cooldown,
        CEIL(EXTRACT(EPOCH FROM (((clock_timestamp() AT TIME ZONE 'UTC')::date + 1)::timestamp AT TIME ZONE 'UTC') - clock_timestamp()))::int AS reset
      FROM "GenerationBudget" WHERE scope IN (${scopes[0]}, ${scopes[1]})`;
    const global = rows.find((row) => row.scope === "global")!;
    const user = rows.find((row) => row.scope === scopes[1])!;
    if (global.attempts >= 500 || user.attempts >= 20) return Math.max(1, user.reset);
    if (user.cooldown > 0) return user.cooldown;
    await tx.$executeRaw`
      UPDATE "GenerationBudget" SET attempts = attempts + 1, "lastAttempt" = clock_timestamp()
      WHERE scope IN (${scopes[0]}, ${scopes[1]})`;
    return 0;
  }, { maxWait: 2000, timeout: 3000 });
}
