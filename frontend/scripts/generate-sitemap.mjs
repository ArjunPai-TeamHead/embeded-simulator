/**
 * Auto-generates public/sitemap.xml by parsing seoRoutes.ts
 * Pure Node.js — no tsx/ts-node needed.
 * Run: node scripts/generate-sitemap.mjs [--ping]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOMAIN = 'https://velxio.dev';
const TODAY = new Date().toISOString().slice(0, 10);

// Parse seoRoutes.ts to extract the route objects
const seoRoutesPath = resolve(__dirname, '../src/seoRoutes.ts');
const source = readFileSync(seoRoutesPath, 'utf-8');

// Extract the array content between SEO_ROUTES = [ ... ];
const match = source.match(/SEO_ROUTES[^=]*=\s*\[([\s\S]*?)\];/);
if (!match) {
  console.error('Could not parse SEO_ROUTES from seoRoutes.ts');
  process.exit(1);
}

// Evaluate the array (safe: only contains string/number/boolean literals)
// Convert TS-style comments and trailing commas to valid JSON-ish
const arrayStr = match[1]
  .replace(/\/\/.*$/gm, '')   // remove line comments
  .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments

// Use Function constructor to evaluate the JS array literal.
// Inject DOMAIN so template literals like `${DOMAIN}/path` resolve correctly.
const routes = new Function('DOMAIN', `return [${arrayStr}]`)(DOMAIN);

const indexable = routes.filter((r) => !r.noindex);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${indexable
  .map(
    (r) => `
  <url>
    <loc>${DOMAIN}${r.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${r.changefreq ?? 'monthly'}</changefreq>
    <priority>${r.priority ?? 0.5}</priority>
  </url>`
  )
  .join('')}

</urlset>
`;

const outPath = resolve(__dirname, '../public/sitemap.xml');
writeFileSync(outPath, xml.trimStart(), 'utf-8');
console.log(`sitemap.xml generated → ${indexable.length} URLs (${TODAY})`);

// Ping search engines (optional)
if (process.argv.includes('--ping')) {
  const sitemapUrl = `${DOMAIN}/sitemap.xml`;
  const pings = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  console.log('Pinging search engines...');
  await Promise.allSettled(
    pings.map(async (url) => {
      try {
        const res = await fetch(url);
        console.log(`  ${res.ok ? 'OK' : 'FAIL'} ${url.split('?')[0]}`);
      } catch (e) {
        console.log(`  FAIL ${url.split('?')[0]}: ${e.message}`);
      }
    })
  );
}
