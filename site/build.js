#!/usr/bin/env node
/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 *
 * Static site build. Runs after `vite build` (see package.json "build") and
 * writes the crawlable marketing/content pages into dist/:
 *
 *   dist/index.html              landing page
 *   dist/<path>/index.html       docs, guides, comparisons
 *   dist/404.html                served by src/server.js for unknown pages
 *   dist/site.css                shared stylesheet
 *   dist/sitemap.xml             every indexable page, including /app/
 *
 * To add a page: create a module in site/pages/ exporting a page object (or
 * an array of them) and add it to PAGES below. It is added to the sitemap
 * automatically.
 */

const fs = require('fs');
const path = require('path');
const { renderPage, SITE_URL } = require('./layout');

const DIST = path.join(__dirname, '..', 'dist');

const PAGES = [
  require('./pages/home'),
  require('./pages/docs'),
  ...require('./pages/guides'),
  ...require('./pages/compare'),
  require('./pages/not-found')
];

// Default <lastmod> for the sitemap. Bump it (or set `updated` on a page)
// when content actually changes - Google ignores lastmod values that change
// on every deploy without real content changes.
const SITE_UPDATED = '2026-09-30';

// Pages that exist but aren't generated here (the Vite-built React app)
const EXTRA_SITEMAP_ENTRIES = [
  { path: '/app/', priority: '0.9' }
];

function outputFile(page) {
  if (page.output) return page.output;
  return path.join(page.path.replace(/^\//, ''), 'index.html');
}

function buildSitemap(entries) {
  const urls = entries.map(e => `  <url>
    <loc>${SITE_URL}${e.path}</loc>
    <lastmod>${e.updated || SITE_UPDATED}</lastmod>
    <priority>${e.priority || '0.5'}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function main() {
  if (!fs.existsSync(path.join(DIST, 'app', 'index.html'))) {
    throw new Error('dist/app/index.html not found - run `vite build` first (yarn build does both).');
  }

  const seen = new Set();
  for (const page of PAGES) {
    if (seen.has(page.path)) {
      throw new Error(`Duplicate page path: ${page.path}`);
    }
    seen.add(page.path);

    const file = path.join(DIST, outputFile(page));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderPage(page));
  }

  fs.copyFileSync(path.join(__dirname, 'site.css'), path.join(DIST, 'site.css'));

  const sitemapEntries = [
    ...PAGES.filter(p => p.sitemap !== false && !p.noindex),
    ...EXTRA_SITEMAP_ENTRIES
  ];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(sitemapEntries));

  console.log(`✓ Static site: ${PAGES.length} pages, ${sitemapEntries.length} sitemap URLs written to dist/`);
}

main();
