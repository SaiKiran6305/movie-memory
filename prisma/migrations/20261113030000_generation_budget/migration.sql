CREATE TABLE "GenerationBudget" (
  "scope" TEXT NOT NULL PRIMARY KEY,
  "day" DATE NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "lastAttempt" TIMESTAMPTZ(3)
);
