import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), getFact: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/generate-fact", () => ({ generateFact: vi.fn() }));
vi.mock("@/lib/facts", () => ({ createFactService: () => mocks.getFact }));
import { POST } from "../src/app/api/fact/route";
beforeEach(() => vi.resetAllMocks());
it("returns 401 for an unauthenticated request", async () => {
  mocks.auth.mockResolvedValue(null);
  const response = await POST(
    new Request("http://localhost:3000/api/fact", { method: "POST" }),
  );
  expect(response.status).toBe(401);
  expect(mocks.getFact).not.toHaveBeenCalled();
});
it("uses user A's session even when the request supplies user B's identity", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "user-a" } });
  mocks.getFact.mockResolvedValue({
    status: "cached",
    fact: "A's fact",
    createdAt: new Date().toISOString(),
  });
  const response = await POST(
    new Request("http://localhost:3000/api/fact?userId=user-b", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: JSON.stringify({ userId: "user-b" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.getFact).toHaveBeenCalledWith("user-a");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
it("rejects cross-origin authenticated requests", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "user-a" } });
  expect(
    (
      await POST(
        new Request("http://localhost:3000/api/fact", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(mocks.getFact).not.toHaveBeenCalled();
});
it("returns 202 and retry guidance for an active generation", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "user-a" } });
  mocks.getFact.mockResolvedValue({ status: "generating", retryAfterMs: 1000 });
  const response = await POST(
    new Request("http://localhost:3000/api/fact", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
  );
  expect(response.status).toBe(202);
  expect(response.headers.get("Retry-After")).toBe("1");
});
