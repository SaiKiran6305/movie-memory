import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
export type StoredFact = {
  id: string;
  text: string;
  createdAt: Date;
  fresh: boolean;
  serverTime: Date;
};
export class FactStore {
  constructor(private db: PrismaClient) {}
  async latest(userId: string, key: string): Promise<StoredFact | null> {
    const rows = await this.db.$queryRaw<StoredFact[]>`
      SELECT id, text, "createdAt", clock_timestamp() AS "serverTime", ("createdAt" > now() - interval '60 seconds') AS fresh
      FROM "MovieFact" WHERE "userId" = ${userId} AND "movieKey" = ${key}
      ORDER BY "createdAt" DESC, id DESC LIMIT 1`;
    return rows[0] ?? null;
  }
  async recent(userId: string, key: string): Promise<string[]> {
    const rows = await this.db.movieFact.findMany({
      where: { userId, movieKey: key },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: { text: true },
    });
    return rows.map((row) => row.text);
  }
  async claim(userId: string, key: string, token: string) {
    const rows = await this.db.$queryRaw<{ token: string }[]>`
      INSERT INTO "FactGeneration" ("userId", "movieKey", token, "leaseExpiresAt")
      VALUES (${userId}, ${key}, ${token}, now() + interval '30 seconds')
      ON CONFLICT ("userId", "movieKey") DO UPDATE
      SET token = EXCLUDED.token, "leaseExpiresAt" = EXCLUDED."leaseExpiresAt"
      WHERE "FactGeneration"."leaseExpiresAt" <= now()
      RETURNING token`;
    return rows.length === 1;
  }
  async release(userId: string, key: string, token: string) {
    await this.db.factGeneration.deleteMany({
      where: { userId, movieKey: key, token },
    });
  }
  async save(
    userId: string,
    key: string,
    title: string,
    token: string,
    text: string,
  ): Promise<StoredFact | null> {
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '1s'`;
        // Lock by key first, then check the current database wall clock after any wait.
        // now() is transaction-start time; clock_timestamp() avoids stale expiry checks here.
        const guards = await tx.$queryRaw<{ token: string }[]>`
        SELECT token FROM "FactGeneration" WHERE "userId" = ${userId} AND "movieKey" = ${key} FOR UPDATE`;
        if (guards[0]?.token !== token) return null;
        const valid = await tx.$queryRaw<{ valid: boolean }[]>`
        SELECT ("leaseExpiresAt" > clock_timestamp()) AS valid FROM "FactGeneration"
        WHERE "userId" = ${userId} AND "movieKey" = ${key} AND token = ${token}`;
        if (!valid[0]?.valid) return null;
        const saved = await tx.$queryRaw<StoredFact[]>`
        INSERT INTO "MovieFact" (id, "userId", "movieKey", "movieTitle", text, "createdAt")
        VALUES (${randomUUID()}, ${userId}, ${key}, ${title}, ${text}, clock_timestamp())
        RETURNING id, text, "createdAt", clock_timestamp() AS "serverTime", true AS fresh`;
        await tx.factGeneration.deleteMany({
          where: { userId, movieKey: key, token },
        });
        return saved[0];
      },
      { maxWait: 2000, timeout: 3000 },
    );
  }
}
