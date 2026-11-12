import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { PrismaClient } from "@prisma/client";
import type { FactResponse } from "./fact-contract";
import { FactStore, type StoredFact } from "./fact-store";
import { movieKey } from "./movie";
import { AppError } from "./http";
export type FactGenerator = (movie: string) => Promise<string>;
function present(
  fact: StoredFact,
  status: "fresh" | "cached" | "stale-fallback",
): FactResponse {
  return { status, fact: fact.text, createdAt: fact.createdAt.toISOString() };
}
export function createFactService(db: PrismaClient, generate: FactGenerator) {
  const store = new FactStore(db);
  return async function getFact(userId: string): Promise<FactResponse> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { favoriteMovie: true },
    });
    if (!user)
      throw new AppError("UNAUTHENTICATED", "Please sign in again.", 401);
    if (!user.favoriteMovie)
      throw new AppError(
        "ONBOARDING_REQUIRED",
        "Choose your favorite movie first.",
        409,
      );
    const title = user.favoriteMovie;
    const key = movieKey(title);
    const previous = await store.latest(userId, key);
    if (previous?.fresh) return present(previous, "cached");
    const token = randomUUID();
    if (!(await store.claim(userId, key, token))) {
      const deadline = performance.now() + 3000;
      do {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const latest = await store.latest(userId, key);
        if (latest?.fresh) return present(latest, "cached");
      } while (performance.now() < deadline);
      const latest = await store.latest(userId, key);
      return latest
        ? present(latest, "stale-fallback")
        : { status: "generating", retryAfterMs: 1000 };
    }
    try {
      const rechecked = await store.latest(userId, key);
      if (rechecked?.fresh) return present(rechecked, "cached");
      let text: string;
      try {
        text = await generate(title);
        if (!text.trim() || text.length > 2000)
          throw new AppError(
            "INVALID_FACT",
            "The fact was incomplete. Please try again.",
            503,
          );
      } catch {
        console.warn(
          JSON.stringify({
            event: "generation_failed",
            category: "provider_error",
          }),
        );
        const fallback = await store.latest(userId, key);
        if (fallback) return present(fallback, "stale-fallback");
        throw new AppError(
          "GENERATION_FAILED",
          "We couldn't find a fact right now. Please try again.",
          503,
        );
      }
      const saved = await store.save(userId, key, title, token, text);
      if (saved) return present(saved, "fresh");
      const winner = await store.latest(userId, key);
      return winner
        ? present(winner, winner.fresh ? "cached" : "stale-fallback")
        : { status: "generating", retryAfterMs: 1000 };
    } finally {
      try {
        await store.release(userId, key, token);
      } catch {
        console.warn(
          JSON.stringify({
            event: "lease_cleanup_failed",
            category: "database_error",
          }),
        );
      }
    }
  };
}
