const { SITE_URL, OG_IMAGE, esc } = require('../layout');

// FAQ entries render both as visible <details> and as FAQPage JSON-LD, so the
// two can never drift apart.
const FAQ = [
  {
    q: 'Is MirageAPI free?',
    a: 'Yes. The web app is free to use with no signup, and the source code is MIT-licensed on GitHub.'
  },
  {
    q: 'Which spec formats are supported?',
    a: 'OpenAPI 3.0 and 3.1 and Swagger/OpenAPI 2.0, in JSON or YAML. The spec is validated before any endpoints go live.'
  },
  {
    q: 'Does the generated data respect my schema?',
    a: 'Yes. Types, formats (email, uuid, date, date-time, uri and more), enums, minimum/maximum, minLength/maxLength, array sizes and nested objects are all respected. Every request returns freshly generated data.'
  },
  {
    q: 'Is my spec stored anywhere?',
    a: 'In the web app your spec is kept in server memory for your browser session only (up to 24 hours). It is never written to a database. For fully private specs, run the open-source CLI on your own machine.'
  },
  {
    q: 'Can I run it locally or in CI?',
    a: 'Yes. Clone the repository and run node src/index.js --spec ./openapi.yaml --port 3000 to get a local mock server with every endpoint live.'
  },
  {
    q: 'Does MirageAPI validate incoming requests?',
    a: 'Not yet. Today it focuses on generating realistic responses. If you need strict request validation, see our comparison with Prism.'
  }
];

const body = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">OpenAPI mock server</p>
    <h1>Instant mock servers from any OpenAPI spec</h1>
    <p class="lead">Drop in an OpenAPI or Swagger file and every endpoint is live in seconds, returning fresh, constraint-aware data on every call. No signup. No install. No hand-written stubs.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/app/">Launch the app — it's free</a>
      <a class="btn" href="/docs/">Read the docs</a>
    </div>
    <p class="muted">Supports OpenAPI 3.0, 3.1 and Swagger 2.0 · JSON or YAML · MIT-licensed</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>How it works</h2>
    <ol class="steps">
      <li><h3>Add your spec</h3><p class="muted">Upload, paste or load the demo spec. MirageAPI validates it and lists every path and method.</p></li>
      <li><h3>Start the mock server</h3><p class="muted">One click and every endpoint in the spec is live — GET, POST, PUT, PATCH and DELETE.</p></li>
      <li><h3>Call your endpoints</h3><p class="muted">Use the built-in request tester, curl or Postman. Each call returns newly generated data that matches your schema.</p></li>
    </ol>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div>
      <h2>Data that follows your schema</h2>
      <p>MirageAPI reads every field's type, format and constraints. A <code>uuid</code> is a real UUID, an <code>email</code> is a valid address, an <code>enum</code> picks one of its values, and numbers stay inside <code>minimum</code>/<code>maximum</code>.</p>
      <p>Arrays, nested objects, <code>allOf</code>, <code>oneOf</code> and <code>anyOf</code> are all handled, so your frontend sees the shapes it will see in production.</p>
      <p><a href="/docs/#data-generation">See every supported rule →</a></p>
    </div>
    <pre><code>$ curl http://localhost:3000/orders/42
{
  "id": "ba7c859d-8a94-4044-abfa-2d6986a14936",
  "customerId": "4ad89051-d769-4100-8ae3-606b16840af8",
  "totalAmount": 7444.42,
  "currency": "EUR",
  "status": "shipped",
  "items": [
    { "id": "5425723c-…", "quantity": 3, "unitPrice": 45.06 }
  ],
  "createdAt": "2025-10-21T10:01:39.085Z"
}</code></pre>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>Built for teams who can't reach the real API</h2>
    <div class="grid">
      <div class="card"><h3>Frontend first</h3><p>Build UI against the contract before the backend exists. <a href="/guides/frontend-without-backend/">See how</a>.</p></div>
      <div class="card"><h3>Locked-down upstreams</h3><p>Integrate with systems you can't access from dev because of security or compliance rules.</p></div>
      <div class="card"><h3>Demos and prototypes</h3><p>Show a working flow with believable data without standing up any infrastructure.</p></div>
      <div class="card"><h3>Spec quality checks</h3><p>A validation report flags errors and gaps in your spec before anyone builds against it.</p></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2>How MirageAPI compares</h2>
    <div class="grid">
      <a class="card" href="/compare/prism/"><h3>MirageAPI vs Prism</h3><p>Browser-based and zero-install vs a CLI with strict request validation.</p></a>
      <a class="card" href="/compare/mockoon/"><h3>MirageAPI vs Mockoon</h3><p>Spec-driven generation vs a desktop app for hand-built mocks.</p></a>
      <a class="card" href="/compare/wiremock/"><h3>MirageAPI vs WireMock</h3><p>Instant OpenAPI mocks vs a powerful Java stubbing framework.</p></a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap narrow">
    <h2>Frequently asked questions</h2>
    ${FAQ.map(item => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`).join('\n    ')}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="card" style="text-align:center;padding:40px 22px">
      <h2 style="margin-top:0">Mock your API in the next 30 seconds</h2>
      <p class="muted">No account, no credit card, nothing to install.</p>
      <p><a class="btn btn-primary" href="/app/">Launch MirageAPI</a></p>
    </div>
  </div>
</section>
`;

module.exports = {
  path: '/',
  title: 'MirageAPI — Free Online OpenAPI Mock Server',
  description: 'Drop in an OpenAPI or Swagger spec and get a live mock server with realistic, constraint-aware data in seconds. Free, no signup, no install.',
  // Google Search Console ownership verification must stay on the homepage
  head: '<meta name="google-site-verification" content="yNjJDESo7oX_ufXxkF8ODvt3pZ2AKGZ4dZR9jVZW1Rk" />',
  priority: '1.0',
  body,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MirageAPI',
      url: `${SITE_URL}/`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'MirageAPI',
      url: `${SITE_URL}/`,
      image: OG_IMAGE,
      description: 'Drop in an OpenAPI spec and get a fully functional mock server with realistic, constraint-aware dummy data — instantly.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
  ]
};
