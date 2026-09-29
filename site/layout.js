/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 *
 * Shared page shell for the static marketing/content pages: <head> (SEO,
 * Open Graph, Twitter, JSON-LD), site navigation and footer.
 */

const SITE_URL = 'https://mirageapi.com';
const SITE_NAME = 'MirageAPI';
const GITHUB_URL = 'https://github.com/venkatbandaru99/mirage';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

// Escape text for HTML text nodes and attribute values
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Serialize JSON-LD safely inside a <script> tag
function jsonLdTag(data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function breadcrumbLd(breadcrumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`
    }))
  };
}

const NAV_LINKS = [
  { href: '/docs/', label: 'Docs' },
  { href: '/guides/', label: 'Guides' },
  { href: '/compare/', label: 'Compare' },
  { href: GITHUB_URL, label: 'GitHub', external: true }
];

function nav(currentPath) {
  const links = NAV_LINKS.map(link => {
    const current = !link.external && currentPath.startsWith(link.href);
    const attrs = link.external ? ' rel="noopener"' : '';
    return `<a href="${link.href}"${attrs}${current ? ' aria-current="page"' : ''}>${link.label}</a>`;
  }).join('');

  return `<header class="site-header">
  <div class="wrap nav">
    <a class="wordmark" href="/" aria-label="MirageAPI home"><span class="accent">Mi</span>rage<span class="accent">API</span></a>
    <nav aria-label="Main">${links}</nav>
    <a class="btn btn-primary btn-sm" href="/app/">Launch app</a>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="wordmark" href="/"><span class="accent">Mi</span>rage<span class="accent">API</span></a>
      <p class="muted">Instant mock servers from any OpenAPI spec.</p>
    </div>
    <div>
      <h2>Product</h2>
      <a href="/app/">Launch app</a>
      <a href="/docs/">Documentation</a>
      <a href="${GITHUB_URL}" rel="noopener">GitHub</a>
    </div>
    <div>
      <h2>Guides</h2>
      <a href="/guides/mock-api-from-openapi/">Mock an API from OpenAPI</a>
      <a href="/guides/frontend-without-backend/">Frontend without a backend</a>
    </div>
    <div>
      <h2>Compare</h2>
      <a href="/compare/prism/">vs Prism</a>
      <a href="/compare/mockoon/">vs Mockoon</a>
      <a href="/compare/wiremock/">vs WireMock</a>
    </div>
  </div>
  <div class="wrap footer-legal muted">
    <span>© 2024 Satya Bandaru. MirageAPI™</span>
    <a href="${GITHUB_URL}/blob/main/LICENSE" rel="noopener">MIT License</a>
  </div>
</footer>`;
}

/**
 * Render a full HTML page.
 * page: { path, title, description, body, jsonLd?, breadcrumbs?, ogType?, head? }
 */
function renderPage(page) {
  const url = `${SITE_URL}${page.path}`;
  const ld = [...(page.jsonLd || [])];
  if (page.breadcrumbs) {
    ld.push(breadcrumbLd(page.breadcrumbs));
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
${page.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`}
${page.head || ''}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#14161E" />
<meta property="og:type" content="${page.ogType || 'website'}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="en_US" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="MirageAPI — Instant mock servers from any OpenAPI spec" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/site.css" />
${ld.map(jsonLdTag).join('\n')}
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
${nav(page.path)}
<main id="content">
${page.body}
</main>
${footer()}
</body>
</html>
`;
}

module.exports = { renderPage, esc, SITE_URL, SITE_NAME, GITHUB_URL, OG_IMAGE };
