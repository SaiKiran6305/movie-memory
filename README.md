# Movie Memory

A full-stack movie companion built with Next.js, TypeScript, React, Tailwind CSS, Prisma, and PostgreSQL.

**Selected extension: Variant A — caching and correctness.**

Development is in progress. Google OAuth and live generation require environment configuration. No credentials belong in this repository.

## Development

Use Node.js 22 or later. Run `npm ci`, copy `.env.example` to `.env`, and configure your own credentials. Start PostgreSQL with `docker compose up -d`. Database migrations and the complete setup guide will be included with the implementation.

## Planned delivery

1. Application and development tooling
2. Google authentication and onboarding
3. Fact generation, database caching, and concurrency protection
4. Dashboard and recovery states
5. Integration tests and deployment documentation
