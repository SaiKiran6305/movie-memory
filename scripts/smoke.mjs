import { pathToFileURL } from 'node:url';

export async function smoke(origin, request = fetch) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash) throw new Error('Supply an HTTP(S) origin only.');
  const failures = [];
  const checks = [
    { path: '/', status: 200 },
    { path: '/dashboard', redirect: true },
    { path: '/onboarding', redirect: true },
    { path: '/api/fact', method: 'POST', status: 401, private: true },
    { path: '/api/me/movie', method: 'PUT', status: 401, private: true },
  ];
  for (const check of checks) {
    try {
      const response = await request(new URL(check.path, url), {
        method: check.method || 'GET', redirect: 'manual',
        signal: AbortSignal.timeout(10000),
        // No cookies or authorization are sent; these calls must remain unauthenticated.
      });
      if (check.redirect) {
        const location = response.headers.get('location');
        const target = location ? new URL(location, url) : null;
        if (![302, 303, 307, 308].includes(response.status) || !target ||
          target.origin !== url.origin || target.pathname !== '/')
          failures.push(`${check.path}: expected a redirect to the landing page.`);
      } else if (response.status !== check.status) {
        failures.push(`${check.path}: expected ${check.status}, received ${response.status}.`);
      }
      if (check.private) {
        const cache = response.headers.get('cache-control') || '';
        if (!/\bprivate\b/i.test(cache) || !/\bno-store\b/i.test(cache))
          failures.push(`${check.path}: missing private, no-store cache policy.`);
      }
      await response.body?.cancel();
    } catch { failures.push(`${check.path}: request failed or timed out.`); }
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const failures = await smoke(process.argv[2]);
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
    else console.log('Public landing, protected redirects, and unauthenticated API checks passed. Complete the signed-in walkthrough separately.');
  } catch { console.error('Usage: node scripts/smoke.mjs https://YOUR_HOST'); process.exitCode = 1; }
}
