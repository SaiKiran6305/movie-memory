import { describe, expect, it } from "vitest";
import { movieKey, movieSchema } from "../src/lib/movie";
import { requireSameOrigin, requireUserId } from "../src/lib/http";
describe("input and request boundaries", () => {
  it("normalizes equivalent titles", () => {
    expect(movieKey("  Interstellar  ")).toBe("interstellar");
    expect(movieKey("The   Dark Knight")).toBe("the dark knight");
  });
  it("trims movie input and rejects empty, long and unexpected fields", () => {
    expect(movieSchema.parse({ movie: " Interstellar " }).movie).toBe(
      "Interstellar",
    );
    for (const body of [
      { movie: " " },
      { movie: "a".repeat(201) },
      { movie: "a\nb" },
      { movie: "Interstellar", userId: "victim" },
    ])
      expect(movieSchema.safeParse(body).success).toBe(false);
  });
  it("requires an authenticated user", () => {
    expect(() => requireUserId(null)).toThrow();
  });
  it("rejects cross-origin and absent-origin writes", () => {
    expect(() =>
      requireSameOrigin(new Request("http://localhost:3000/api/fact")),
    ).toThrow();
    expect(() =>
      requireSameOrigin(
        new Request("http://localhost:3000/api/fact", {
          headers: { origin: "https://other.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      requireSameOrigin(
        new Request("http://localhost:3000/api/fact", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
});
