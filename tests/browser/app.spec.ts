import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
const ids: string[] = [];
test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
async function signIn(
  context: import("@playwright/test").BrowserContext,
  movie: string | null,
) {
  const id = `browser-${randomUUID()}`;
  ids.push(id);
  await db.user.create({
    data: {
      id,
      name: "Sai Kiran",
      email: `${id}@example.test`,
      favoriteMovie: movie,
    },
  });
  const token = await encode({
    token: { sub: id },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return id;
}
test("landing is responsive and protected routes redirect", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Sign in with Google/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: /Some movies/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL("http://localhost:3000/");
});
test("onboarding saves the movie and redirects returning users", async ({
  page,
  context,
}) => {
  const id = await signIn(context, null);
  await page.route("**/api/fact", (route) =>
    route.fulfill({
      json: {
        status: "cached",
        fact: "A test movie fact.",
        createdAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/");
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("Your favorite movie").fill("  Interstellar  ");
  await page.getByRole("button", { name: /Make it memorable/ }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: "Interstellar", exact: true }),
  ).toBeVisible();
  expect((await db.user.findUnique({ where: { id } }))?.favoriteMovie).toBe(
    "Interstellar",
  );
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/dashboard/);
});
test("dashboard renders before the fact and recovers from errors", async ({
  page,
  context,
}) => {
  await signIn(context, "Interstellar");
  let responseMode = "loading";
  await page.route("**/api/fact", async (route) => {
    if (responseMode === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return route.fulfill({
        json: {
          status: "cached",
          fact: "A saved test fact about the film.",
          createdAt: new Date().toISOString(),
        },
      });
    }
    if (responseMode === "error")
      return route.fulfill({
        status: 503,
        json: {
          error: { code: "GENERATION_FAILED", message: "Please try again." },
        },
      });
    return route.fulfill({
      json: {
        status: "stale-fallback",
        fact: "An older test fact.",
        createdAt: new Date(Date.now() - 120000).toISOString(),
      },
    });
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await expect(page.getByText("Finding a story worth sharing…")).toBeVisible();
  await expect(
    page.getByText("A saved test fact about the film."),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  responseMode = "error";
  await page.getByRole("button", { name: /Refresh fact/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please try again." })).toHaveText("Please try again.");
  responseMode = "fallback";
  await page.getByRole("button", { name: /Try again/ }).click();
  await expect(
    page.getByText("Showing an older fact while a new one is unavailable."),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Sign out/ }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL("http://localhost:3000/");
});
test("unauthenticated API calls return 401", async ({ request }) => {
  expect((await request.post("/api/fact")).status()).toBe(401);
  expect(
    (
      await request.put("/api/me/movie", { data: { movie: "Interstellar" } })
    ).status(),
  ).toBe(401);
});
