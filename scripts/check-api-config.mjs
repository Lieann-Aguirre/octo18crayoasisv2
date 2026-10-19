import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', source);
if (parsed.error) {
  console.error('Cannot read wrangler.jsonc. Check its JSONC syntax.');
  process.exit(1);
}
const config = parsed.config;
const db = config.d1_databases?.find(binding => binding.binding === 'DB');
const problems = [];
if (!db || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(db.database_id || '')) {
  problems.push('DB needs the real D1 Database ID (UUID), not REPLACE_WITH_D1_ID. Find it in Cloudflare → Storage & databases → D1 → octo18, or run npx wrangler d1 list after signing in.');
}
try {
  const origin = new URL(config.vars?.SITE_ORIGIN);
  if (origin.protocol !== 'https:' || origin.hostname.endsWith('.example') || origin.origin !== config.vars.SITE_ORIGIN) {
    throw new Error('Invalid origin');
  }
} catch {
  problems.push('Set vars.SITE_ORIGIN to the actual HTTPS storefront origin, without a trailing slash (for example, your Pages URL or custom domain).');
}
if (!config.r2_buckets?.some(binding => binding.binding === 'MEDIA' && binding.bucket_name)) {
  problems.push('Configure the MEDIA binding with the name of an existing private R2 bucket.');
}
if (problems.length) {
  console.error(`API deployment is not configured:\n\n${problems.map(p => `- ${p}`).join('\n\n')}\n\nThis Worker deploys the API only. Deploy the Astro storefront with Cloudflare Pages: npm run build → dist.`);
  process.exit(1);
}
console.log('API configuration format passed. Cloudflare will verify account access and the existence of D1/R2 resources during deployment.');
