/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

const express = require('express');
const session = require('express-session');
const compression = require('compression');
const crypto = require('crypto');
const path = require('path');
const { STATUS_CODES } = require('http');
const DataGenerator = require('./generator');
const SpecParser = require('./parser');
const { fetchSpecText, SafeFetchError } = require('./safe-fetch');

class MockServer {
  constructor(parsedPaths, options = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.generator = new DataGenerator();
    this.parser = new SpecParser();
    this.webMode = options.webMode || false;
    // Routes from the --spec file in CLI mode; web mode loads specs per session
    this.cliPaths = parsedPaths || {};

    // Railway terminates HTTPS in front of the app; trust its proxy headers so
    // req.protocol and req.ip are the client's.
    this.app.set('trust proxy', 1);
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Session middleware for multi-user support.
    // --web mode is the one exposed publicly (e.g. via Railway), so it must not
    // fall back to a hardcoded secret. Plain CLI mode generates a per-process
    // random secret instead of requiring env setup for the simple local flow -
    // sessions don't need to survive a restart since the server is stateless.
    if (this.webMode && !process.env.SESSION_SECRET) {
      throw new Error(
        'SESSION_SECRET environment variable is required in --web mode. Set it to a random secret string, e.g.:\n' +
        '  SESSION_SECRET=$(openssl rand -hex 32) yarn start:web'
      );
    }
    const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

    this.app.use(session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));
    
    this._setupMiddleware();
    this._setupWebRoutes();
    this._setupApiRoutes();
    this._setupMockRoutes();
    this._setupErrorHandling();
  }

  // Session helper methods
  _initializeSession(req) {
    if (!req.session.mirage) {
      // CLI mode serves the --spec routes to every client immediately;
      // web mode starts empty and disabled until the user uploads a spec.
      req.session.mirage = {
        parsedPaths: this.webMode ? {} : this.cliPaths,
        mockServerEnabled: !this.webMode,
        lastSpecContent: null,
        lastSpecType: null,
        sessionId: req.sessionID
      };
    }
    return req.session.mirage;
  }

  _getSessionData(req) {
    return this._initializeSession(req);
  }

  _setupMiddleware() {
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers',
        'Content-Type, Authorization, Prefer, X-Mirage-Status, X-Mirage-Delay, X-Mirage-Example, X-Mirage-Validate');
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      next();
    });
  }

  _setupWebRoutes() {
    // Simple health check for Railway
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'mirage'
      });
    });

    if (this.webMode) {
      // The start command serves a prebuilt dist/ (yarn build runs in the
      // deploy's build phase). Make a missing build obvious in the logs.
      if (!require('fs').existsSync(path.join(__dirname, '../dist/app/index.html'))) {
        console.error('⚠️  dist/ is missing or incomplete - run `yarn build` before `yarn start:web`.');
      }

      // Serve examples folder for sample specs
      this.app.use('/examples', express.static(path.join(__dirname, '../examples')));
      
      // Serve the built site from dist:
      //   /             landing page       (site/build.js)
      //   /docs/ etc.   content pages      (site/build.js)
      //   /app/         the React app      (Vite)
      // express.static maps /docs/ to docs/index.html and redirects /docs to
      // /docs/. Vite fingerprints everything under /assets, so those can be
      // cached forever; HTML must always be revalidated so deploys show up.
      this.app.use(express.static(path.join(__dirname, '../dist'), {
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        }
      }));
    }
  }

  _setupApiRoutes() {
    // API routes for web interface
    this.app.post('/api/parse-spec', async (req, res) => {
      try {
        const { spec, type } = req.body;
        const sessionData = this._getSessionData(req);
        
        if (!spec) {
          return res.status(400).json({ error: 'OpenAPI spec is required' });
        }
        if (type !== 'yaml' && type !== 'json') {
          return res.status(400).json({ error: 'Invalid spec type. Must be yaml or json' });
        }

        res.json(await this._loadSpec(sessionData, spec, type));
      } catch (error) {
        res.status(400).json({
          error: 'Failed to parse OpenAPI spec',
          message: error.message
        });
      }
    });

    // Load a spec from a public URL. The fetch refuses private/internal
    // addresses (see src/safe-fetch.js) because this runs on a public server.
    this.app.post('/api/parse-spec-url', async (req, res) => {
      const { url } = req.body || {};
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'A spec URL is required', message: 'A spec URL is required' });
      }

      let text;
      try {
        text = await fetchSpecText(url.trim());
      } catch (error) {
        const message = error instanceof SafeFetchError ? error.message : 'Could not fetch the URL';
        return res.status(400).json({ error: 'Failed to fetch spec', message });
      }

      try {
        const type = looksLikeJson(text) ? 'json' : 'yaml';
        const result = await this._loadSpec(this._getSessionData(req), text, type);
        res.json({ ...result, spec: text, type });
      } catch (error) {
        res.status(400).json({ error: 'Failed to parse OpenAPI spec', message: error.message });
      }
    });

    // A ready-to-send request for a route: path parameters filled in,
    // required query parameters added, and a body generated from the request
    // schema. Used by the app's tester so requests pass validation for any spec.
    this.app.get('/api/sample-request', (req, res) => {
      const sessionData = this._getSessionData(req);
      const route = sessionData.parsedPaths[req.query.route];
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      res.json(this._sampleRequest(route));
    });

    this.app.get('/api/routes', (req, res) => {
      const sessionData = this._getSessionData(req);
      const routes = Object.entries(sessionData.parsedPaths).map(([key, info]) => ({
        route: key,
        path: info.path,
        method: info.method,
        hasRequestBody: !!info.requestBody,
        responseTypes: Object.keys(info.responses || {}),
        parameters: info.parameters || [],
        requestBodySchema: info.requestBody?.schema || null,
        tags: info.tags || [],
        summary: info.summary
      }));
      
      res.json({ routes, sessionId: sessionData.sessionId });
    });

    // Server control endpoints
    this.app.post('/api/server/start', (req, res) => {
      try {
        const sessionData = this._getSessionData(req);
        // In web mode, the server is already running, so we just enable mock endpoints
        sessionData.mockServerEnabled = true;
        res.json({ 
          success: true, 
          message: 'Mock server enabled',
          endpoints: Object.keys(sessionData.parsedPaths).length,
          sessionId: sessionData.sessionId
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to start mock server', message: error.message });
      }
    });

    this.app.post('/api/server/stop', (req, res) => {
      try {
        const sessionData = this._getSessionData(req);
        // Disable mock endpoints but keep web interface running
        sessionData.mockServerEnabled = false;
        res.json({ 
          success: true, 
          message: 'Mock server disabled',
          sessionId: sessionData.sessionId 
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to stop mock server', message: error.message });
      }
    });

    this.app.get('/api/server/status', (req, res) => {
      const sessionData = this._getSessionData(req);
      res.json({
        running: sessionData.mockServerEnabled || false,
        endpoints: Object.keys(sessionData.parsedPaths).length,
        port: this.port,
        sessionId: sessionData.sessionId
      });
    });

    // Endpoint to re-validate current spec
    this.app.get('/api/validate-current-spec', async (req, res) => {
      try {
        const sessionData = this._getSessionData(req);
        
        if (!sessionData.lastSpecContent || !sessionData.lastSpecType) {
          return res.status(404).json({
            error: 'No spec loaded',
            message: 'No OpenAPI specification is currently loaded for validation',
            sessionId: sessionData.sessionId
          });
        }

        // Re-run validation on the current spec
        const SwaggerParser = require('@apidevtools/swagger-parser');
        const SpecValidator = require('./validator');
        const yaml = require('js-yaml');
        
        // Parse the spec from the raw content
        let specObject;
        if (sessionData.lastSpecType === 'yaml') {
          specObject = yaml.load(sessionData.lastSpecContent);
        } else {
          specObject = JSON.parse(sessionData.lastSpecContent);
        }
        
        // Validate the parsed spec
        const parsedSpec = await SwaggerParser.validate(specObject);
        
        const validator = new SpecValidator();
        const validationResults = validator.validateSpec(parsedSpec, sessionData.lastSpecContent, sessionData.lastSpecType);

        console.log('🔍 Re-validation complete:');
        console.log(`  - Quality Score: ${validationResults.qualityScore}%`);
        console.log(`  - Issues: ${validationResults.summary.errors} errors, ${validationResults.summary.warnings} warnings, ${validationResults.summary.suggestions} suggestions`);

        res.json({
          success: true,
          validation: validationResults,
          message: 'Current spec re-validated successfully',
          sessionId: sessionData.sessionId
        });
      } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
          error: 'Validation failed',
          message: error.message
        });
      }
    });
  }

  // Parse and validate spec text, then store its routes in the session.
  // Shared by the paste/upload endpoint and the load-from-URL endpoint.
  async _loadSpec(sessionData, text, type) {
    const yaml = require('js-yaml');
    const specData = type === 'yaml' ? yaml.load(text) : JSON.parse(text);

    const specParser = new SpecParser();
    // Validate the spec with original text for line numbers
    await specParser._validateAndParseSpec(specData, text, type);
    sessionData.parsedPaths = specParser.getParsedPaths();

    // Store the spec content and type for re-validation in session
    sessionData.lastSpecContent = text;
    sessionData.lastSpecType = type;

    return {
      success: true,
      paths: sessionData.parsedPaths,
      info: specParser.getSpec()?.info || {},
      specVersion: specParser.getSpecVersion(),
      validation: specParser.getValidationResults(),
      sessionId: sessionData.sessionId
    };
  }

  // Build { path, query, body } for a route using generated values
  _sampleRequest(route) {
    const pathParams = {};
    const query = {};
    for (const param of route.parameters || []) {
      if (param.in === 'path') {
        pathParams[param.name] = this.generator.generateFromSchema(param.schema, 0, param.name);
      } else if (param.in === 'query' && param.required) {
        query[param.name] = this.generator.generateFromSchema(param.schema, 0, param.name);
      }
    }
    const path = route.path.replace(/\{([^}]+)\}/g, (_, name) =>
      encodeURIComponent(String(pathParams[name] ?? name)));

    const body = route.requestBody?.schema
      ? this.generator.generateFromSchema(withoutReadOnly(route.requestBody.schema))
      : undefined;

    return { path, query, body };
  }

  // Per-request mock controls from query parameters (?__example=true) or
  // headers (Prefer / X-Mirage-*). The __ query parameters are MirageAPI's own
  // and are ignored when matching and validating the request.
  _readControls(req) {
    const q = req.query || {};
    const prefer = String(req.headers.prefer || '').toLowerCase();
    const truthy = v => v !== undefined && ['1', 'true', 'yes', ''].includes(String(v).toLowerCase());

    // Status: ?__status=404, X-Mirage-Status: 404, or Prefer: code=404 (Prism)
    const preferCode = /(?:^|[\s,;])code=(\d{3})/.exec(prefer);
    const statusInput = q.__status ?? req.headers['x-mirage-status'] ?? (preferCode && preferCode[1]);
    const status = parseInt(statusInput, 10);

    return {
      useExamples: truthy(q.__example) ||
        truthy(req.headers['x-mirage-example']) ||
        /(^|[\s,;])example(=|$|[\s,;])/.test(prefer),
      status: status >= 200 && status <= 599 ? status : null,
      delayMs: parseDelay(q.__delay ?? req.headers['x-mirage-delay'])
    };
  }

  // Respond with a simulated status code. Uses the spec's response for that
  // code when it defines one (schema or example), otherwise a generic body.
  _respondWithStatus(res, route, status, controls) {
    if (status === 204 || status === 304) {
      return res.status(status).end();
    }

    const entry = route.responses[String(status)] ||
      (status >= 400 ? route.responses.default : undefined);
    if (entry && (entry.schema || (controls.useExamples && entry.example !== undefined))) {
      return res.status(status).json(this.generator.generateResponseData(entry, controls));
    }

    const reason = STATUS_CODES[status] || 'Status';
    return res.status(status).json(status >= 400
      ? { error: reason, status, message: `Simulated ${status} response` }
      : { status, message: reason });
  }

  // Find the spec route for a request. Tries an exact "METHOD /path" key
  // first, then OpenAPI path templates such as /customers/{id}.
  // Returns { route, pathParams } or null.
  _matchRoute(parsedPaths, method, requestPath) {
    const exact = parsedPaths[`${method} ${requestPath}`];
    if (exact) {
      return { route: exact, pathParams: {} };
    }

    for (const [key, route] of Object.entries(parsedPaths)) {
      const [routeMethod, routePath] = key.split(' ', 2);
      if (routeMethod !== method) continue;

      const names = [];
      const pattern = routePath
        .split('/')
        .map(segment => segment.replace(/[.*+?^$()|[\]\\]/g, '\\$&')
          .replace(/\{([^}]+)\}/g, (_, name) => {
            names.push(name);
            return '([^/]+)';
          }))
        .join('/');
      const match = new RegExp(`^${pattern}$`).exec(requestPath);
      if (match) {
        const pathParams = {};
        names.forEach((name, i) => {
          try {
            pathParams[name] = decodeURIComponent(match[i + 1]);
          } catch (error) {
            pathParams[name] = match[i + 1]; // malformed %-escape
          }
        });
        return { route, pathParams };
      }
    }
    return null;
  }

  // Respond to a mock request from a set of spec routes. Used by the session
  // catch-all below and by shared mock URLs. Returns false when no route
  // matches so the caller can fall through to a 404.
  _dispatchMock(req, res, parsedPaths, requestPath = req.path) {
    const match = this._matchRoute(parsedPaths, req.method, requestPath);
    if (!match) {
      return false;
    }
    const controls = this._readControls(req);
    const respond = () => {
      if (res.headersSent) return;
      if (controls.status) {
        this._respondWithStatus(res, match.route, controls.status, controls);
      } else {
        this._handleRequest(req, res, match.route, controls);
      }
    };

    if (controls.delayMs > 0) {
      res.setHeader('X-Mirage-Delay', String(controls.delayMs));
      setTimeout(respond, controls.delayMs);
    } else {
      respond();
    }
    return true;
  }

  _setupMockRoutes() {
    // Set up a catch-all handler for dynamic routes
    this.app.use((req, res, next) => {
      // Skip API routes and static files
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/_mirage/') || 
          req.path.startsWith('/assets/') ||
          req.path === '/') {
        return next();
      }

      const sessionData = this._getSessionData(req);

      // Check if mock server is enabled for this session
      if (!sessionData.mockServerEnabled) {
        // Browsers and crawlers asking for a page or a static file (favicon,
        // apple-touch-icon, etc.) should get a 404, not a 503 - search engines
        // treat repeated 5xx as a failing site and back off crawling.
        if (this.webMode && this._isPageOrStaticRequest(req)) {
          return next();
        }

        return res.status(503).json({
          error: 'Mock server is disabled',
          message: 'Please enable the mock server to test endpoints',
          sessionId: sessionData.sessionId,
          timestamp: new Date().toISOString()
        });
      }

      if (this._dispatchMock(req, res, sessionData.parsedPaths)) {
        return;
      }

      // Continue to next middleware (will eventually hit 404 handler)
      next();
    });

    this.app.get('/_mirage/health', (req, res) => {
      const sessionData = this._getSessionData(req);
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        routes: Object.keys(sessionData.parsedPaths).length,
        sessionId: sessionData.sessionId
      });
    });

    this.app.get('/_mirage/routes', (req, res) => {
      const sessionData = this._getSessionData(req);
      const routes = Object.entries(sessionData.parsedPaths).map(([key, info]) => ({
        route: key,
        path: info.path,
        method: info.method,
        hasRequestBody: !!info.requestBody,
        responseTypes: Object.keys(info.responses || {})
      }));
      
      res.json({ routes, sessionId: sessionData.sessionId });
    });

    // Catch-all 404 (must be last)
    // Every real page is a static file served above, so anything reaching
    // here is a 404. Browsers get the site's 404 page; API clients fall
    // through to the JSON 404 handler.
    if (this.webMode) {
      this.app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/_mirage/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        if (req.accepts(['json', 'html']) !== 'html') {
          return next();
        }
        res.status(404).sendFile(path.join(__dirname, '../dist/404.html'), {
          headers: { 'Cache-Control': 'no-cache' }
        });
      });
    }
  }

  // True for GET/HEAD requests from a browser/crawler navigating to a page, or
  // for well-known static file paths. API clients (fetch, curl, Postman) send
  // Accept: */* or application/json and are not matched.
  _isPageOrStaticRequest(req) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return false;
    }
    if (/\.(png|jpe?g|gif|svg|ico|webp|webmanifest|xml|txt|css|js|map)$/i.test(req.path)) {
      return true;
    }
    return req.accepts(['json', 'html']) === 'html';
  }

  _handleRequest(req, res, routeInfo, controls = {}) {
    const { method } = routeInfo;

    try {
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        return this._handleMutationRequest(req, res, routeInfo, controls);
      } else {
        return this._handleQueryRequest(req, res, routeInfo, controls);
      }
    } catch (error) {
      console.error(`Error handling request: ${error.message}`);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleQueryRequest(req, res, routeInfo, controls = {}) {
    const { responses } = routeInfo;
    
    const successResponse = responses['200'] || responses['201'] || responses['default'];
    
    if (successResponse) {
      const responseData = this.generator.generateResponseData(successResponse, controls);
      return res.status(200).json(responseData);
    } else {
      return res.status(200).json({
        message: 'Success',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleMutationRequest(req, res, routeInfo, controls = {}) {
    const { responses, requestBody } = routeInfo;
    
    // In example mode the spec's example response wins over echoing the body
    const exampleResponse = responses['201'] || responses['200'];
    if (controls.useExamples && exampleResponse && exampleResponse.example !== undefined) {
      return res.status(201).json(exampleResponse.example);
    }

    if (requestBody && req.body && Object.keys(req.body).length > 0) {
      const generatedId = this.generator.faker.string.uuid();
      const echoResponse = this.generator.generateRequestEcho(req.body, generatedId);
      return res.status(201).json(echoResponse);
    }
    
    const successResponse = responses['201'] || responses['200'] || responses['default'];
    
    if (successResponse) {
      const responseData = this.generator.generateResponseData(successResponse, controls);
      return res.status(201).json(responseData);
    } else {
      return res.status(201).json({
        id: this.generator.faker.string.uuid(),
        message: 'Created successfully',
        timestamp: new Date().toISOString()
      });
    }
  }

  _setupErrorHandling() {
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: Object.keys(this._getSessionData(req).parsedPaths || {}),
        timestamp: new Date().toISOString()
      });
    });

    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`\nMirage mock server running on http://localhost:${this.port}`);
          
          if (this.webMode) {
            console.log(`🌐 Web interface: http://localhost:${this.port}`);
            console.log(`📡 API endpoints: http://localhost:${this.port}/api/*`);
          }
          
          if (this.webMode) {
            // Web mode routes are session-specific and appear when users upload specs
            console.log(`📋 Mock endpoints will be available per user session after uploading OpenAPI specs`);
          } else {
            console.log(`📋 Endpoints:`);
            for (const route of Object.keys(this.cliPaths)) {
              console.log(`   ${route}`);
            }
          }
          
          console.log(`\n💡 Health check: GET http://localhost:${this.port}/_mirage/health`);
          console.log(`📝 Route info: GET http://localhost:${this.port}/_mirage/routes\n`);
          
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.port} is already in use. Please try a different port.`));
          } else {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp() {
    return this.app;
  }
}

// "800" -> 800 ms, "200-800" -> random value in that range. Capped at 10 s.
const MAX_DELAY_MS = 10000;
function parseDelay(input) {
  if (input === undefined || input === null || input === '') return 0;
  const range = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(input));
  let ms;
  if (range) {
    const [lo, hi] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
    ms = lo + Math.floor(Math.random() * (hi - lo + 1));
  } else {
    ms = Number(input);
  }
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(Math.round(ms), MAX_DELAY_MS);
}

function looksLikeJson(text) {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch (error) {
    return false;
  }
}

// Copy of a schema without readOnly properties (e.g. a server-generated id),
// used for request bodies
function withoutReadOnly(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 10) return schema;
  const copy = { ...schema };
  if (schema.properties) {
    copy.properties = {};
    for (const [name, prop] of Object.entries(schema.properties)) {
      if (!prop || !prop.readOnly) {
        copy.properties[name] = withoutReadOnly(prop, depth + 1);
      }
    }
    if (Array.isArray(schema.required)) {
      copy.required = schema.required.filter(name => name in copy.properties);
    }
  }
  if (schema.items) copy.items = withoutReadOnly(schema.items, depth + 1);
  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    if (Array.isArray(schema[key])) copy[key] = schema[key].map(s => withoutReadOnly(s, depth + 1));
  }
  return copy;
}

module.exports = MockServer;
module.exports.withoutReadOnly = withoutReadOnly;