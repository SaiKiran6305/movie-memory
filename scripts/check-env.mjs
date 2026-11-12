// Run with Node's --env-file option; values are never included in diagnostics.
import { pathToFileURL } from 'node:url';

export function checkEnvironment(env) {
  const errors = [];
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'AUTH_URL', 'AUTH_SECRET',
    'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'OPENAI_API_KEY']) {
    if (!env[key]?.trim()) errors.push(`${key} is required.`);
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    if (!env[key]?.trim()) continue;
    try {
      const url = new URL(env[key]);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2)
        errors.push(`${key} must be a Postgres URL with a database name.`);
      if (key === 'DIRECT_URL' && url.hostname.endsWith('.neon.tech') && url.hostname.includes('-pooler.'))
        errors.push('DIRECT_URL must use the direct Neon hostname, without -pooler.');
      if (url.hostname.endsWith('.neon.tech') && !['require', 'verify-full'].includes(url.searchParams.get('sslmode')))
        errors.push(`${key} must enable TLS for Neon (sslmode=require or verify-full).`);
    } catch { errors.push(`${key} is not a valid URL.`); }
  }
  if (env.AUTH_URL?.trim()) {
    try {
      const url = new URL(env.AUTH_URL);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (!['http:', 'https:'].includes(url.protocol) || (!local && url.protocol !== 'https:') ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash)
        errors.push('AUTH_URL must be an HTTPS origin (HTTP is allowed on localhost).');
    } catch { errors.push('AUTH_URL is not a valid URL.'); }
  }
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32)
    errors.push('AUTH_SECRET must contain at least 32 characters; generate it randomly.');
  for (const key of Object.keys(env)) {
    if (/^NEXT_PUBLIC_.*(SECRET|API_KEY|DATABASE_URL|DIRECT_URL)/i.test(key) && env[key])
      errors.push(`${key} must not expose server credentials through NEXT_PUBLIC_.`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = checkEnvironment(process.env);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Environment structure passed. Credentials and service access still need live verification.');
}
