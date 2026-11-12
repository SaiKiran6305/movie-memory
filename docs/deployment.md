# Production setup

Use Node.js 22.12+ and keep credentials in your local ignored `.env` and Vercel's environment settings. Do not put secrets into commits, PR descriptions, screenshots, or client variables.

1. Check your Neon, Vercel, and OpenAI account allowances before creating resources. OpenAI API usage has separate billing; do not assume a ChatGPT subscription covers it.
2. Create the Neon database and choose a nearby Vercel function region. Copy the pooled URL into `DATABASE_URL` and the direct URL into `DIRECT_URL`. Preserve TLS parameters and the bounded application connection options documented in the README.
3. Import the repository into Vercel with the Next.js preset and Node.js 22. Reserve the stable production hostname before configuring OAuth.
4. In Google Cloud, create a Web application OAuth client. Add the exact production callback `https://YOUR_HOST/api/auth/callback/google`. Set the consent-screen audience and add reviewer accounts as test users when in testing.
5. Add `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `OPENAI_API_KEY`, and a random `AUTH_SECRET` to the production environment. Generate the session secret with `openssl rand -base64 32`. Select `OPENAI_MODEL` if overriding the default. Restrict preview environments to separate credentials and a separate database.
6. In a trusted local shell with the deployment values in `.env`, run `node --env-file=.env scripts/check-env.mjs`. The check prints setting names only. It validates structure, not credential validity, billing, database reachability, or account quotas.
7. Run `npm ci`, then `npm run db:migrate` with the production direct URL available. Run migrations once in a controlled release step, rather than on every preview build. Review migrations and database recovery options before applying later schema changes.
8. Deploy the reviewed commit. Vercel builds with `npm run build`. Redeploy after changing environment settings. The fact route already declares its 20-second duration; verify the selected Vercel plan supports it.

Run the standalone configuration tests with `node --test scripts/check-env.test.mjs`.

If a deployment fails, inspect the failing stage before retrying. Do not paste environment values into logs. Roll application code back to a compatible prior deployment when needed; code rollback does not undo database migrations.
