// Comparison pages: /compare/ hub plus one page per competitor.
// Keep these factual and fair - they rank best (and convert best) when they
// honestly say where the other tool is the better choice.

const { esc } = require('../layout');

const REVIEWED = '2026-09-30';
const REVIEWED_LABEL = 'September 2026';

const COMPETITORS = [
  {
    slug: 'prism',
    name: 'Prism',
    title: 'MirageAPI vs Prism: OpenAPI Mock Server Comparison',
    description: 'Compare MirageAPI and Stoplight Prism for mocking OpenAPI specs: setup, data generation, request validation and when to choose each.',
    summary: 'Browser-based and zero-install vs a CLI with strict request validation.',
    intro: 'Stoplight Prism is a popular open-source (Apache 2.0) command-line mock server for OpenAPI. Both tools turn a spec into a running mock and validate requests against it, but they optimise for different things: MirageAPI for getting a realistic, shareable mock running instantly with nothing to install, Prism for running close to your codebase and checking a real API against the contract.',
    rows: [
      ['How you run it', 'In the browser, or a Node.js CLI', 'Node.js CLI (npm or Docker)'],
      ['Install required', 'No (web app)', 'Yes'],
      ['Spec formats', 'OpenAPI 2.0, 3.0, 3.1 (JSON/YAML)', 'OpenAPI 2.0, 3.0, 3.1; Postman collections'],
      ['Response data', 'Always freshly generated from the schema', 'Examples from the spec by default; generated data in dynamic mode'],
      ['Uses spec examples', 'Yes, opt-in (Prefer: example)', 'Yes, by default'],
      ['Request validation', 'Yes', 'Yes'],
      ['Choose response code per request', 'Yes (Prefer: code or ?__status)', 'Yes, via the Prefer header'],
      ['Latency simulation', 'Yes (?__delay)', 'Not built in'],
      ['Shareable public mock URL', 'Yes, free (7 days)', 'Via the Stoplight platform'],
      ['Validation proxy to a real API', 'No', 'Yes'],
      ['Built-in request tester UI', 'Yes', 'No'],
      ['Spec quality report', 'Yes', 'Validates the spec on load'],
      ['Price', 'Free, MIT-licensed', 'Free, Apache 2.0']
    ],
    chooseThem: [
      'You want to proxy to a real server and check its responses against the spec.',
      'Your spec has carefully written examples you want returned by default.',
      'You mock Postman collections as well as OpenAPI specs.'
    ],
    chooseUs: [
      'You want a working mock in seconds without installing anything.',
      'You want varied, realistic data on every call rather than the same example.',
      'You want a public mock URL to share with teammates, a frontend or CI.',
      'Non-developers (PMs, QA, designers) need to explore the API in a browser.'
    ]
  },
  {
    slug: 'mockoon',
    name: 'Mockoon',
    title: 'MirageAPI vs Mockoon: Which API Mocking Tool Should You Use?',
    description: 'Compare MirageAPI and Mockoon: spec-driven mock generation in the browser vs a desktop app for hand-built mock APIs.',
    summary: 'Spec-driven generation vs a desktop app for hand-built mocks.',
    intro: 'Mockoon is an open-source (MIT) desktop application for designing mock APIs, with a CLI and Docker image for running them. It shines when you want fine-grained control over every route. MirageAPI takes the opposite approach: your OpenAPI spec is the single source of truth and the mock is generated from it automatically.',
    rows: [
      ['How you run it', 'In the browser, or a Node.js CLI', 'Desktop app (Windows, macOS, Linux), CLI, Docker'],
      ['Install required', 'No (web app)', 'Yes'],
      ['Primary workflow', 'Generate everything from an OpenAPI spec', 'Build routes and responses by hand; OpenAPI import available'],
      ['Response data', 'Generated automatically from schema constraints', 'Templates you write, with Faker.js helpers'],
      ['Response rules and conditions', 'No', 'Yes'],
      ['Stateful CRUD', 'Not yet', 'Yes'],
      ['Latency and status simulation', 'Yes, per request', 'Yes'],
      ['Request validation against the spec', 'Yes', 'No'],
      ['Proxy to a real API', 'No', 'Yes'],
      ['Stays in sync when the spec changes', 'Yes — reload the spec', 'Re-import the spec'],
      ['Team sharing / cloud hosting', 'Free share links (7 days)', 'Paid Mockoon Cloud plans'],
      ['Price', 'Free, MIT-licensed', 'Free, MIT-licensed; paid cloud plans']
    ],
    chooseThem: [
      'You want detailed control over each route, rule and response.',
      'You need stateful CRUD behaviour today.',
      'You prefer a native desktop app.'
    ],
    chooseUs: [
      'Your OpenAPI spec already exists and should drive the mock.',
      'You don\'t want to write or maintain response templates.',
      'You want to share a mock URL without anyone installing an app or paying for cloud hosting.'
    ]
  },
  {
    slug: 'wiremock',
    name: 'WireMock',
    title: 'MirageAPI vs WireMock: OpenAPI Mocking Compared',
    description: 'Compare MirageAPI and WireMock: instant OpenAPI mocks with generated data vs a powerful Java-based HTTP stubbing framework.',
    summary: 'Instant OpenAPI mocks vs a powerful Java stubbing framework.',
    intro: 'WireMock is a mature open-source (Apache 2.0) HTTP stubbing tool that runs as a standalone server, in Docker, or embedded in JVM tests. It is extremely flexible, and that flexibility means you describe each stub yourself. MirageAPI instead reads your OpenAPI spec and mocks every endpoint automatically.',
    rows: [
      ['How you run it', 'In the browser, or a Node.js CLI', 'Standalone JAR, Docker, or embedded in JVM tests'],
      ['Install required', 'No (web app)', 'Yes (Java or Docker)'],
      ['Setup from an OpenAPI spec', 'Automatic — every path is mocked', 'Write stub mappings; OpenAPI import in WireMock Cloud'],
      ['Response data', 'Generated from schema constraints', 'Defined per stub, with response templating'],
      ['Advanced request matching', 'Path and method', 'Headers, body, query, JSON path and more'],
      ['Record and playback', 'No', 'Yes'],
      ['Fault and delay simulation', 'Status codes and delays (no connection faults)', 'Yes'],
      ['Validates requests against an OpenAPI spec', 'Yes', 'Via WireMock Cloud'],
      ['Stateful scenarios', 'Not yet', 'Yes'],
      ['Browser UI and shareable URL', 'Yes, free', 'WireMock Cloud (commercial)'],
      ['Price', 'Free, MIT-licensed', 'Free, Apache 2.0; commercial WireMock Cloud']
    ],
    chooseThem: [
      'You are writing JVM integration tests and want stubs in code.',
      'You need precise request matching, record/playback or fault injection.',
      'You mock APIs that have no OpenAPI spec.'
    ],
    chooseUs: [
      'You have an OpenAPI spec and want every endpoint mocked with no stub writing.',
      'You want realistic, schema-valid data without authoring responses.',
      'You want a zero-install, browser-based mock for demos and frontend work.'
    ]
  }
];

function list(items) {
  return `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

function comparePage(c) {
  const others = COMPETITORS.filter(o => o.slug !== c.slug)
    .map(o => `<a href="/compare/${o.slug}/">MirageAPI vs ${o.name}</a>`).join(' · ');

  const body = `
<div class="wrap narrow page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/compare/">Compare</a> / ${c.name}</nav>
  <h1>MirageAPI vs ${c.name}</h1>
  <p class="lead">${esc(c.intro)}</p>

  <h2>Feature comparison</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>Feature</th><th>MirageAPI</th><th>${c.name}</th></tr></thead>
    <tbody>
      ${c.rows.map(([f, us, them]) => `<tr><td>${esc(f)}</td><td>${esc(us)}</td><td>${esc(them)}</td></tr>`).join('\n      ')}
    </tbody>
  </table></div>
  <p class="muted">Last reviewed ${REVIEWED_LABEL}. Both tools evolve quickly — check the ${c.name} documentation for its latest features.</p>

  <h2>Choose ${c.name} if…</h2>
  ${list(c.chooseThem)}

  <h2>Choose MirageAPI if…</h2>
  ${list(c.chooseUs)}

  <div class="callout">You can try MirageAPI with your own spec right now — no signup. <a href="/app/">Launch the app →</a></div>

  <p>More comparisons: ${others}</p>
</div>
`;

  return {
    path: `/compare/${c.slug}/`,
    title: c.title,
    description: c.description,
    priority: '0.7',
    body,
    ogType: 'article',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Compare', path: '/compare/' },
      { name: `MirageAPI vs ${c.name}`, path: `/compare/${c.slug}/` }
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `MirageAPI vs ${c.name}`,
        description: c.description,
        dateModified: REVIEWED,
        author: { '@type': 'Person', name: 'Satya Bandaru' },
        publisher: { '@type': 'Organization', name: 'MirageAPI' }
      }
    ]
  };
}

const hub = {
  path: '/compare/',
  title: 'MirageAPI Alternatives & Comparisons — Prism, Mockoon, WireMock',
  description: 'How MirageAPI compares with other API mocking tools including Stoplight Prism, Mockoon and WireMock, and when each one is the better fit.',
  priority: '0.7',
  breadcrumbs: [
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare/' }
  ],
  body: `
<div class="wrap page">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Compare</nav>
  <h1>How MirageAPI compares</h1>
  <p class="lead">Every API mocking tool makes different trade-offs. These honest, side-by-side comparisons show where MirageAPI fits and when another tool is the better choice.</p>
  <div class="grid">
    ${COMPETITORS.map(c => `<a class="card" href="/compare/${c.slug}/"><h3>MirageAPI vs ${c.name}</h3><p>${esc(c.summary)}</p></a>`).join('\n    ')}
  </div>
</div>
`
};

module.exports = [hub, ...COMPETITORS.map(comparePage)];
