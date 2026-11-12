# Verify the deployed release

After deployment, run `node scripts/smoke.mjs https://YOUR_HOST` using Node.js 22.12+. It sends no credentials and does not call OpenAI as an authenticated user. It checks the public landing, protected-page redirects, unauthenticated API rejection, and private API cache headers. A Vercel deployment-protection page can block these checks: test the intended public production URL.

Run the script's isolated tests with `node --test scripts/smoke.test.mjs`. These tests use fake responses; passing them does not verify a deployment.

## Signed-in walkthrough

Use a Google account allowed by the consent screen. Record observations against the deployed commit; leave unchecked steps as unverified.

- [ ] Sign in from the landing page. A first-time user reaches onboarding.
- [ ] Submit whitespace-only input and verify validation. Save a valid movie and verify the trimmed title appears on the dashboard.
- [ ] Verify the profile and movie appear before the fact finishes loading. Verify missing profile photo/name have usable fallbacks.
- [ ] Verify a real OpenAI fact appears, labeled AI-generated. This may incur API charges.
- [ ] Refresh within 60 seconds: the response is cached with the same creation timestamp. After expiry, refresh and verify a new stored fact. New text may coincidentally repeat; use timestamps/status rather than text differences.
- [ ] Open two tabs and refresh after expiry. Verify one successful generation for the burst in database records and no cross-user data.
- [ ] Sign out, then navigate back to protected pages and call protected APIs: redirects and 401 responses must prevent access.
- [ ] Sign in again and verify onboarding is skipped. Use a second account to verify separate profile, movie, and fact data.
- [ ] Test at mobile width and with keyboard navigation, including visible focus and form/error announcements.

Provider-outage testing belongs on an isolated staging deployment: temporarily use an invalid staging OpenAI credential, redeploy, and verify stale fallback for a user with history and Retry for one without history. Restore the credential afterward. Do not break production credentials to simulate an outage.

Automated browser tests use signed test sessions and mocked provider responses. They supplement this walkthrough; they do not verify live Google consent, billing, API access, or provider factual accuracy.
