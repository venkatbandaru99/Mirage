// Served by src/server.js with a 404 status for any unknown page URL.
// Not listed in the sitemap and marked noindex.

module.exports = {
  path: '/404.html',
  output: '404.html',
  noindex: true,
  sitemap: false,
  title: 'Page not found — MirageAPI',
  description: 'The page you were looking for does not exist.',
  body: `
<div class="wrap narrow page" style="text-align:center">
  <p class="eyebrow">404</p>
  <h1>Page not found</h1>
  <p class="lead" style="margin:0 auto">That page doesn't exist. If you were calling a mock endpoint, make sure the mock server is started in <a href="/app/">the app</a>.</p>
  <div class="hero-actions" style="justify-content:center">
    <a class="btn btn-primary" href="/">Go to the homepage</a>
    <a class="btn" href="/docs/">Read the docs</a>
  </div>
</div>
`
};
