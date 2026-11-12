import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createFactService } from "../src/lib/facts";
import { FactStore } from "../src/lib/fact-store";
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "TEST_DATABASE_URL must point to a disposable Postgres database",
  );
const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
const store = new FactStore(db);
const a = `test-${randomUUID()}`;
const b = `test-${randomUUID()}`;
const key = "interstellar";
async function oldFact(userId = a, movieKey = key) {
  const fact = await db.movieFact.create({
    data: {
      userId,
      movieKey,
      movieTitle: movieKey,
      text: "A previously saved fact.",
    },
  });
  await db.$executeRaw`UPDATE "MovieFact" SET "createdAt" = now() - interval '61 seconds' WHERE id = ${fact.id}`;
  return fact;
}
beforeAll(async () => {
  await db.user.createMany({
    data: [
      { id: a, email: `${a}@example.test`, favoriteMovie: "Interstellar" },
      { id: b, email: `${b}@example.test`, favoriteMovie: "Interstellar" },
    ],
  });
});
beforeEach(async () => {
  await db.factGeneration.deleteMany({ where: { userId: { in: [a, b] } } });
  await db.movieFact.deleteMany({ where: { userId: { in: [a, b] } } });
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [a, b] } } });
  await db.$disconnect();
});
describe("database fact generation", () => {
  it("reuses a fact under 60 seconds old", async () => {
    await db.movieFact.create({
      data: {
        userId: a,
        movieKey: key,
        movieTitle: "Interstellar",
        text: "Cached fact",
      },
    });
    const generate = vi.fn(async () => "New fact");
    expect(await createFactService(db, generate)(a)).toMatchObject({
      status: "cached",
      fact: "Cached fact",
    });
    expect(generate).not.toHaveBeenCalled();
  });
  it("regenerates a fact aged 60 seconds", async () => {
    const fact = await oldFact();
    await db.$executeRaw`UPDATE "MovieFact" SET "createdAt" = now() - interval '60 seconds' WHERE id = ${fact.id}`;
    expect(
      await createFactService(db, async () => "Boundary result")(a),
    ).toMatchObject({ status: "fresh", fact: "Boundary result" });
  });
  it("regenerates and persists an expired fact", async () => {
    await oldFact();
    const generate = vi.fn(async () => "New fact");
    expect(await createFactService(db, generate)(a)).toMatchObject({
      status: "fresh",
      fact: "New fact",
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(await db.movieFact.count({ where: { userId: a } })).toBe(2);
  });
  it("isolates user A from user B and unrelated movies", async () => {
    await db.movieFact.createMany({
      data: [
        { userId: b, movieKey: key, movieTitle: key, text: "B's private fact" },
        {
          userId: a,
          movieKey: "inception",
          movieTitle: "Inception",
          text: "Wrong movie",
        },
      ],
    });
    expect(
      await createFactService(db, async () => "A's fact")(a),
    ).toMatchObject({ fact: "A's fact", status: "fresh" });
  });
  it("coordinates 12 concurrent requests through real Postgres", async () => {
    const generate = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return "One generated fact";
    });
    const results = await Promise.all(
      Array.from({ length: 12 }, () => createFactService(db, generate)(a)),
    );
    expect(generate).toHaveBeenCalledOnce();
    expect(
      results.every(
        (result) => "fact" in result && result.fact === "One generated fact",
      ),
    ).toBe(true);
    expect(await db.movieFact.count({ where: { userId: a } })).toBe(1);
  });
  it("falls back on provider failure and releases its guard", async () => {
    await oldFact();
    expect(
      await createFactService(db, async () => {
        throw new Error("Timeout");
      })(a),
    ).toMatchObject({
      status: "stale-fallback",
      fact: "A previously saved fact.",
    });
    expect(await db.factGeneration.count({ where: { userId: a } })).toBe(0);
  });
  it("returns a friendly error if provider fails without a saved fact", async () => {
    await expect(
      createFactService(db, async () => {
        throw new Error("Provider failed");
      })(a),
    ).rejects.toMatchObject({ code: "GENERATION_FAILED", status: 503 });
    expect(await db.factGeneration.count({ where: { userId: a } })).toBe(0);
  });
  it("prevents expired owners from saving or deleting a replacement guard", async () => {
    expect(await store.claim(a, key, "old")).toBe(true);
    await db.$executeRaw`UPDATE "FactGeneration" SET "leaseExpiresAt" = now() - interval '1 second' WHERE "userId" = ${a}`;
    expect(await store.save(a, key, key, "old", "Expired result")).toBeNull();
    expect(await store.claim(a, key, "new")).toBe(true);
    expect(await store.save(a, key, key, "old", "Late result")).toBeNull();
    await store.release(a, key, "old");
    expect(
      (
        await db.factGeneration.findUnique({
          where: { userId_movieKey: { userId: a, movieKey: key } },
        })
      )?.token,
    ).toBe("new");
    expect(
      await store.save(a, key, key, "new", "Winning result"),
    ).not.toBeNull();
    expect(await db.movieFact.count({ where: { userId: a } })).toBe(1);
  });
  it("returns generating after bounded follower waiting", async () => {
    await store.claim(a, key, "other");
    const generate = vi.fn(async () => "Must not run");
    expect(await createFactService(db, generate)(a)).toEqual({
      status: "generating",
      retryAfterMs: 1000,
    });
    expect(generate).not.toHaveBeenCalled();
  });
});
