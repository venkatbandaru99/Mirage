// How-to guides: /guides/ hub plus one page per article. Each targets a
// common search ("mock api from openapi", "frontend without backend") and
// walks through a real, working setup using the sample spec.

const { esc, GITHUB_URL } = require('../layout');

const UPDATED = '2026-09-29';

const GUIDES = [
  {
    slug: 'mock-api-from-openapi',
    title: 'How to Mock an API from an OpenAPI Spec (in 30 Seconds)',
    h1: 'How to mock an API from an OpenAPI spec',
    description: 'Step-by-step: turn an OpenAPI or Swagger file into a live mock server with realistic data, in the browser or locally with the MirageAPI CLI.',
    summary: 'Turn any OpenAPI or Swagger file into a live mock server, in the browser or on localhost.',
    body: `
  <p class="lead">You have an OpenAPI spec, but the real API isn't ready — or you can't reach it from your dev environment. Here's how to get every endpoint responding with realistic data in under a minute.</p>

  <h2>What you need</h2>
  <ul>
    <li>An OpenAPI 3.x or Swagger 2.0 spec in JSON or YAML. No spec yet? Use the <a href="${GITHUB_URL}/blob/main/examples/sample-spec.yaml" rel="noopener">sample customer/order spec</a>.</li>
    <li>A browser — or Node.js 18+ if you want to run it locally.</li>
  </ul>

  <h2>Option 1: In the browser (no install)</h2>
  <ol>
    <li>Open <a href="/app/">the MirageAPI app</a>.</li>
    <li>Drag your spec onto the upload area, click <strong>Browse</strong>, or <strong>Paste</strong> it in. Click <strong>Load demo</strong> to use the sample spec.</li>
    <li>Check the validation panel. It lists errors, warnings and suggestions for your spec.</li>
    <li>Click <strong>Start Server</strong>.</li>
    <li>Select an endpoint such as <code>GET /customers</code> and send the request. Send it again — you get different data every time.</li>
  </ol>

  <h2>Option 2: Locally with the CLI</h2>
  <p>Running locally keeps your spec on your machine and gives you a stable <code>localhost</code> URL that any tool can call.</p>
  <pre><code>git clone ${GITHUB_URL}.git
cd mirage
yarn install

node src/index.js --spec ./path/to/openapi.yaml --port 3000</code></pre>
  <p>Now call it like the real thing:</p>
  <pre><code>$ curl http://localhost:3000/customers/123
{
  "id": "841d15c0-57d1-4083-a085-ca4b6f69e75f",
  …
  "email": "Newton_Hessel@hotmail.com",
  "age": 42,
  "status": "active",
  "createdAt": "2025-12-27T11:24:39.703Z"
}</code></pre>
  <p>The <code>id</code> is a UUID because the spec says <code>format: uuid</code>, <code>age</code> is between 18 and 80 because of <code>minimum</code>/<code>maximum</code>, and <code>status</code> is one of the spec's <code>enum</code> values.</p>

  <h2>Creating resources</h2>
  <p><code>POST</code>, <code>PUT</code> and <code>PATCH</code> requests echo your JSON body back with a generated <code>id</code>, so create flows work end to end:</p>
  <pre><code>$ curl -X POST http://localhost:3000/customers \\
    -H 'Content-Type: application/json' \\
    -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com"}'

{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com",
 "id":"5cf56f6c-ff5e-4906-9af9-980ce4c3a750","createdAt":"2026-09-29T20:41:15.148Z"}</code></pre>

  <h2>Tips for more realistic mocks</h2>
  <ul>
    <li>Add <code>format</code> to strings (<code>email</code>, <code>uuid</code>, <code>date-time</code>, <code>uri</code>) — it's the biggest single improvement.</li>
    <li>Use <code>enum</code> for status fields so your UI sees every state.</li>
    <li>Set <code>minimum</code>/<code>maximum</code> on numbers and <code>minItems</code>/<code>maxItems</code> on arrays to keep values believable.</li>
    <li>Mark fields as <code>required</code> — optional fields are sometimes left out, which is great for testing how your UI handles missing data.</li>
  </ul>
  <p>See the <a href="/docs/#data-generation">full list of generation rules</a> in the docs.</p>
`
  },
  {
    slug: 'frontend-without-backend',
    title: 'Frontend Development Without a Backend: Mock the API from OpenAPI',
    h1: 'Frontend development without a backend',
    description: 'Build and test your frontend before the backend exists by running a local mock server generated from the OpenAPI contract. Works with React, Vue, Angular and Vite.',
    summary: 'Build UI against the API contract before the backend exists, with a local mock server.',
    body: `
  <p class="lead">Waiting on the backend team — or on access to a locked-down upstream system — shouldn't block frontend work. If you agree on an OpenAPI contract first, you can build against a mock generated from it and switch to the real API later with a single config change.</p>

  <h2>1. Agree on the contract</h2>
  <p>Write (or generate) the OpenAPI spec together with the backend team. Be specific about types, formats and enums — the mock is only as realistic as the spec. Commit it to the repo, for example as <code>openapi.yaml</code>.</p>

  <h2>2. Run the mock server locally</h2>
  <pre><code>git clone ${GITHUB_URL}.git
cd mirage && yarn install
node src/index.js --spec ../my-app/openapi.yaml --port 4010</code></pre>
  <p>Every endpoint in the spec is now live on <code>http://localhost:4010</code>. CORS is enabled for all origins, so your dev server on another port can call it directly.</p>

  <h2>3. Point your app at the mock</h2>
  <p>Keep the API base URL in an environment variable so switching is a config change, not a code change. With Vite:</p>
  <pre><code># .env.development
VITE_API_URL=http://localhost:4010

# .env.production
VITE_API_URL=https://api.example.com</code></pre>
  <pre><code>// api.ts
const API_URL = import.meta.env.VITE_API_URL;

export async function getCustomers() {
  const res = await fetch(\`\${API_URL}/customers\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}</code></pre>
  <p>Alternatively, proxy API paths through the Vite dev server so the frontend uses relative URLs:</p>
  <pre><code>// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/customers': 'http://localhost:4010',
      '/orders': 'http://localhost:4010'
    }
  }
});</code></pre>

  <h2>4. Build against varied data</h2>
  <p>Because the mock generates new data on every request, your UI is exercised with different string lengths, array sizes and enum values, and optional fields are sometimes missing. That surfaces layout and null-handling bugs long before production.</p>

  <h2>5. Switch to the real API</h2>
  <p>When the backend is ready, change <code>VITE_API_URL</code> (or the proxy target). Because both sides built against the same contract, integration is usually uneventful.</p>

  <div class="callout">Just want to explore the API or show it to a stakeholder? You don't need the CLI — <a href="/app/">load the spec in the browser</a> and click Start Server.</div>

  <h2>Related</h2>
  <ul>
    <li><a href="/guides/mock-api-from-openapi/">How to mock an API from an OpenAPI spec</a></li>
    <li><a href="/docs/#cli">CLI reference</a></li>
  </ul>
`
  }
];

function guidePage(g) {
  const body = `
<article class="wrap narrow page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/guides/">Guides</a> / ${esc(g.h1)}</nav>
  <h1>${esc(g.h1)}</h1>
  <p class="muted">Updated <time datetime="${UPDATED}">September 29, 2026</time></p>
  ${g.body}
</article>
`;

  return {
    path: `/guides/${g.slug}/`,
    title: g.title,
    description: g.description,
    priority: '0.8',
    ogType: 'article',
    body,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides/' },
      { name: g.h1, path: `/guides/${g.slug}/` }
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: g.h1,
        description: g.description,
        dateModified: UPDATED,
        author: { '@type': 'Person', name: 'Satya Bandaru' },
        publisher: { '@type': 'Organization', name: 'MirageAPI' }
      }
    ]
  };
}

const hub = {
  path: '/guides/',
  title: 'API Mocking Guides — MirageAPI',
  description: 'Practical guides to mocking APIs from OpenAPI specs: getting started, frontend development without a backend, and more.',
  priority: '0.7',
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides/' }
  ],
  body: `
<div class="wrap page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Guides</nav>
  <h1>Guides</h1>
  <p class="lead">Practical walkthroughs for mocking APIs from OpenAPI specs.</p>
  <div class="grid">
    ${GUIDES.map(g => `<a class="card" href="/guides/${g.slug}/"><h3>${esc(g.h1)}</h3><p>${esc(g.summary)}</p></a>`).join('\n    ')}
  </div>
</div>
`
};

module.exports = [hub, ...GUIDES.map(guidePage)];
