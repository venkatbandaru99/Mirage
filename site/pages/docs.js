const { GITHUB_URL } = require('../layout');

const body = `
<div class="wrap narrow page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Docs</nav>
  <h1>MirageAPI documentation</h1>
  <p class="lead">Everything you need to turn an OpenAPI spec into a working mock server, in the browser or on your own machine.</p>

  <div class="toc">
    <strong>On this page</strong>
    <ul>
      <li><a href="#web-app">Using the web app</a></li>
      <li><a href="#sharing">Sharing a mock URL</a></li>
      <li><a href="#cli">Running the CLI locally</a></li>
      <li><a href="#formats">Supported spec formats</a></li>
      <li><a href="#data-generation">How data is generated</a></li>
      <li><a href="#requests">How requests are handled</a></li>
      <li><a href="#validation">Request validation</a></li>
      <li><a href="#controls">Simulating status codes, latency and examples</a></li>
      <li><a href="#built-in-routes">Built-in routes</a></li>
      <li><a href="#limitations">Current limitations</a></li>
    </ul>
  </div>

  <h2 id="web-app">Using the web app</h2>
  <ol>
    <li>Open <a href="/app/">the app</a>.</li>
    <li>Upload a spec file, paste its contents, load it from a public <strong>URL</strong> (GitHub file links work), or click <strong>Load demo</strong> to try the sample customer/order API.</li>
    <li>Review the validation report for errors, warnings and suggestions about your spec.</li>
    <li>Click <strong>Start Server</strong>. Every path in your spec is now live on the same domain, for example <code>https://mirageapi.com/customers</code>.</li>
    <li>Pick an endpoint in the explorer and send a request. The controls above the response let you force a status code, add latency, use the spec's examples or turn validation off.</li>
  </ol>
  <p>Tip: link straight to a spec with <code>https://mirageapi.com/app/?spec=&lt;url&gt;</code> and it loads when the page opens.</p>
  <div class="callout">Mocks in the web app are tied to your browser session (a cookie), so each visitor gets their own isolated mock server. Sessions last up to 24 hours. To call them from another tool, machine or teammate, <a href="#sharing">share a mock URL</a> or <a href="#cli">run the CLI</a>.</div>

  <h2 id="sharing">Sharing a mock URL</h2>
  <p>Click <strong>Share</strong> in the spec bar to get a public link such as <code>https://mirageapi.com/m/Ab3dE7xY</code>. Anyone — a teammate, a frontend app, a CI job — can call your endpoints under it without a browser session:</p>
  <pre><code>curl https://mirageapi.com/m/Ab3dE7xY/customers</code></pre>
  <ul>
    <li>Validation, status and latency simulation and examples all work on shared links.</li>
    <li>Edited the spec? Click <strong>Update link</strong> to publish the changes at the same URL, or <strong>Stop sharing</strong> to turn it off.</li>
    <li><code>GET /m/&lt;id&gt;/_mirage/routes</code> lists the shared routes.</li>
    <li>Links last 7 days and are reset if the MirageAPI server restarts. Each link allows up to 600 requests per minute.</li>
  </ul>

  <h2 id="cli">Running the CLI locally</h2>
  <p>The CLI serves your spec on <code>localhost</code> with no session or browser needed — ideal for frontend development and CI.</p>
  <pre><code>git clone ${GITHUB_URL}.git
cd mirage
yarn install        # or: npm install

node src/index.js --spec ./examples/sample-spec.yaml --port 3000</code></pre>
  <p>On startup the CLI validates the spec, prints every registered endpoint and starts listening:</p>
  <pre><code>✓ Spec loaded and validated successfully
Mirage mock server running on http://localhost:3000
📋 Endpoints:
   GET /customers
   POST /customers
   GET /customers/{id}
   GET /orders
   POST /orders
   GET /orders/{id}</code></pre>
  <h3>Options</h3>
  <div class="table-wrap"><table>
    <thead><tr><th>Option</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>-s, --spec &lt;file&gt;</code></td><td>Path to the OpenAPI spec (JSON or YAML). Required.</td></tr>
      <tr><td><code>-p, --port &lt;number&gt;</code></td><td>Port to listen on. Default <code>3000</code>.</td></tr>
      <tr><td><code>--no-validate</code></td><td>Accept requests that don't match the spec (validation is on by default).</td></tr>
      <tr><td><code>--quiet</code></td><td>Suppress the startup banner.</td></tr>
      <tr><td><code>-w, --web</code></td><td>Run the full web app instead (requires <code>yarn build</code> and a <code>SESSION_SECRET</code> environment variable).</td></tr>
    </tbody>
  </table></div>
  <p>Every request is logged to the console with its timestamp, method and path. CORS is enabled for all origins, so a frontend on another port can call the mock directly.</p>

  <h2 id="formats">Supported spec formats</h2>
  <ul>
    <li>OpenAPI 3.0 and 3.1, and Swagger/OpenAPI 2.0 (response schemas, examples, body and typed parameters)</li>
    <li>JSON or YAML</li>
    <li>Local <code>$ref</code> references between components are resolved automatically</li>
  </ul>
  <p>Specs are validated with <a href="https://github.com/APIDevTools/swagger-parser" rel="noopener">swagger-parser</a> before any route is registered, so a broken spec fails fast with a clear message.</p>

  <h2 id="data-generation">How data is generated</h2>
  <p>Responses are generated from the success response schema (<code>200</code>, then <code>201</code>, then <code>default</code>) using <a href="https://fakerjs.dev/" rel="noopener">Faker</a>. Each request produces new data.</p>
  <div class="table-wrap"><table>
    <thead><tr><th>Schema</th><th>Generated value</th></tr></thead>
    <tbody>
      <tr><td><code>enum</code></td><td>A random value from the list (any type)</td></tr>
      <tr><td><code>string</code>, <code>format: email</code></td><td>A valid email address</td></tr>
      <tr><td><code>string</code>, <code>format: uuid</code></td><td>A v4 UUID</td></tr>
      <tr><td><code>string</code>, <code>format: date</code> / <code>date-time</code> / <code>time</code></td><td>A past date (<code>YYYY-MM-DD</code>), ISO 8601 timestamp, or <code>HH:MM:SS</code></td></tr>
      <tr><td><code>string</code>, <code>format: uri</code> / <code>url</code></td><td>A URL</td></tr>
      <tr><td><code>string</code>, <code>format: phone</code> / <code>password</code> / <code>byte</code> / <code>binary</code></td><td>A phone number, password, base64 string or hex string</td></tr>
      <tr><td><code>string</code> with <code>minLength</code>/<code>maxLength</code></td><td>Text whose length is within the bounds (default 5–50 characters)</td></tr>
      <tr><td><code>string</code> with a common field name</td><td>A realistic value based on the property name: <code>firstName</code>, <code>lastName</code>, <code>name</code>, <code>username</code>, <code>email</code>, <code>phone</code>, <code>street</code>, <code>city</code>, <code>state</code>, <code>country</code>, <code>postalCode</code>, <code>company</code>, <code>productName</code>, <code>url</code>, <code>currency</code> and more, including suffixes such as <code>billingCity</code>. Names ending in <code>Id</code> get a UUID. Used only when the value also satisfies the field's length and <code>pattern</code> constraints.</td></tr>
      <tr><td><code>string</code> with <code>pattern</code></td><td>A value generated from the regular expression and checked against it. Complex patterns (lookaheads, backreferences) fall back to a numeric or word value.</td></tr>
      <tr><td><code>integer</code> / <code>number</code></td><td>A value within <code>minimum</code>/<code>maximum</code> (default 0–1000), honouring <code>exclusiveMinimum</code>, <code>exclusiveMaximum</code> and <code>multipleOf</code>. Numbers are rounded to 2 decimals.</td></tr>
      <tr><td><code>boolean</code></td><td><code>true</code> or <code>false</code></td></tr>
      <tr><td><code>array</code></td><td>Between <code>minItems</code> and <code>maxItems</code> items (default 1–5), each generated from <code>items</code></td></tr>
      <tr><td><code>object</code></td><td>All <code>required</code> properties, plus each optional property about 70% of the time. <code>additionalProperties</code> schemas add a few extra keys.</td></tr>
      <tr><td><code>allOf</code> / <code>oneOf</code> / <code>anyOf</code></td><td><code>allOf</code> schemas are merged; for <code>oneOf</code>/<code>anyOf</code> one option is picked at random</td></tr>
    </tbody>
  </table></div>

  <h2 id="requests">How requests are handled</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>Request</th><th>Response</th></tr></thead>
    <tbody>
      <tr><td><code>GET</code>, <code>DELETE</code> and other methods</td><td><code>200</code> with data generated from the success response schema</td></tr>
      <tr><td><code>POST</code>, <code>PUT</code>, <code>PATCH</code> with a JSON body</td><td><code>201</code> echoing your body, with a generated <code>id</code> and a <code>createdAt</code> timestamp (if not already present)</td></tr>
      <tr><td><code>POST</code>, <code>PUT</code>, <code>PATCH</code> without a body</td><td><code>201</code> with data generated from the <code>201</code>/<code>200</code>/<code>default</code> schema</td></tr>
      <tr><td>Path parameters such as <code>/customers/{id}</code></td><td>Any value matches the route; the value is then <a href="#validation">validated</a> against the parameter's schema</td></tr>
      <tr><td>A request that doesn't match the spec</td><td><code>400</code> listing each problem (see <a href="#validation">request validation</a>)</td></tr>
      <tr><td>A path not in the spec</td><td><code>404</code> with the list of available routes</td></tr>
    </tbody>
  </table></div>

  <h2 id="validation">Request validation</h2>
  <p>Requests are checked against the spec before a response is generated: path parameters, query parameters (required, type, enum, format, ranges) and the JSON body. A request that doesn't match gets a <code>400</code> listing every problem:</p>
  <pre><code>{
  "error": "Request validation failed",
  "errors": [
    { "in": "body", "path": "/lastName", "message": "must have required property 'lastName'" },
    { "in": "body", "path": "/email", "message": "must match format \\"email\\"" }
  ]
}</code></pre>
  <p><code>readOnly</code> properties such as a server-generated <code>id</code> are not required in request bodies. To skip validation, send <code>?__validate=false</code> or the <code>X-Mirage-Validate: false</code> header, untick <strong>Validate requests</strong> in the app, or start the CLI with <code>--no-validate</code>.</p>

  <h2 id="controls">Simulating status codes, latency and examples</h2>
  <p>Add these to any mock request (in the app, use the controls above the response). Query parameters starting with <code>__</code> are MirageAPI's own and are never validated against your spec.</p>
  <div class="table-wrap"><table>
    <thead><tr><th>Control</th><th>Query parameter</th><th>Header</th></tr></thead>
    <tbody>
      <tr><td>Force a status code</td><td><code>?__status=404</code></td><td><code>X-Mirage-Status: 404</code> or <code>Prefer: code=404</code></td></tr>
      <tr><td>Add latency</td><td><code>?__delay=800</code> or a random range <code>?__delay=200-800</code> (max 10 s)</td><td><code>X-Mirage-Delay: 800</code></td></tr>
      <tr><td>Return the spec's examples</td><td><code>?__example=true</code></td><td><code>Prefer: example</code> or <code>X-Mirage-Example: true</code></td></tr>
      <tr><td>Skip validation</td><td><code>?__validate=false</code></td><td><code>X-Mirage-Validate: false</code></td></tr>
    </tbody>
  </table></div>
  <p>A forced status code uses the response your spec defines for that code (its schema or example) when there is one, and a generic <code>{ error, status, message }</code> body otherwise; <code>204</code> has no body. In example mode the response-level example is returned when present; otherwise property <code>example</code> values are used and anything without one is generated.</p>

  <h2 id="built-in-routes">Built-in routes</h2>
  <ul>
    <li><code>GET /_mirage/health</code> — server status and number of loaded routes</li>
    <li><code>GET /_mirage/routes</code> — every mocked route with its method and response codes</li>
  </ul>

  <h2 id="limitations">Current limitations</h2>
  <ul>
    <li>Mocks are stateless: data created with <code>POST</code> is not returned by later <code>GET</code> calls.</li>
    <li>Only JSON request and response bodies are mocked and validated.</li>
    <li>Shared links are kept in memory: they last 7 days and are reset when the server restarts.</li>
  </ul>
  <p>Have a feature request? <a href="${GITHUB_URL}/issues" rel="noopener">Open an issue on GitHub</a>.</p>
</div>
`;

module.exports = {
  path: '/docs/',
  title: 'MirageAPI Docs — Web App, CLI and Data Generation Rules',
  description: 'How to use MirageAPI: mock an OpenAPI spec in the browser or with the CLI, supported formats, and exactly how each schema constraint maps to generated data.',
  priority: '0.9',
  body,
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Docs', path: '/docs/' }
  ],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'MirageAPI documentation',
      description: 'How to use MirageAPI to mock an OpenAPI spec in the browser or with the CLI.',
      dateModified: '2026-09-30',
      author: { '@type': 'Person', name: 'Satya Bandaru' },
      publisher: { '@type': 'Organization', name: 'MirageAPI' }
    }
  ]
};
