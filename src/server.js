const express = require('express');
const path = require('path');
const DataGenerator = require('./generator');
const SpecParser = require('./parser');

class MockServer {
  constructor(parsedPaths, options = {}) {
    this.app = express();
    this.parsedPaths = parsedPaths || {};
    this.port = options.port || 3000;
    this.generator = new DataGenerator();
    this.parser = new SpecParser();
    this.webMode = options.webMode || false;
    this.mockServerEnabled = false;
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    this._setupMiddleware();
    this._setupWebRoutes();
    this._setupApiRoutes();
    this._setupMockRoutes();
    this._setupErrorHandling();
  }

  _setupMiddleware() {
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
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
      // Serve examples folder for sample specs
      this.app.use('/examples', express.static(path.join(__dirname, '../examples')));
      
      // Serve static files from dist directory
      this.app.use(express.static(path.join(__dirname, '../dist')));
      
      // Serve index.html for all non-API routes (SPA routing)
      this.app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      });
    }
  }

  _setupApiRoutes() {
    // API routes for web interface
    this.app.post('/api/parse-spec', async (req, res) => {
      try {
        const { spec, type } = req.body;
        
        if (!spec) {
          return res.status(400).json({ error: 'OpenAPI spec is required' });
        }

        let specData;
        let specParser = new SpecParser();
        
        if (type === 'yaml' || type === 'json') {
          // Parse spec from text content
          if (type === 'yaml') {
            const yaml = require('js-yaml');
            specData = yaml.load(spec);
          } else {
            specData = JSON.parse(spec);
          }
          
          // Validate the spec with original text for line numbers
          await specParser._validateAndParseSpec(specData, spec, type);
          this.parsedPaths = specParser.getParsedPaths();
        } else {
          return res.status(400).json({ error: 'Invalid spec type. Must be yaml or json' });
        }

        const validationResults = specParser.getValidationResults();

        // Store the spec content and type for re-validation
        this.lastSpecContent = spec;
        this.lastSpecType = type;

        res.json({
          success: true,
          paths: this.parsedPaths,
          info: specParser.getSpec()?.info || {},
          validation: validationResults
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to parse OpenAPI spec',
          message: error.message
        });
      }
    });

    this.app.get('/api/routes', (req, res) => {
      const routes = Object.entries(this.parsedPaths).map(([key, info]) => ({
        route: key,
        path: info.path,
        method: info.method,
        hasRequestBody: !!info.requestBody,
        responseTypes: Object.keys(info.responses || {}),
        parameters: info.parameters || [],
        requestBodySchema: info.requestBody?.schema || null
      }));
      
      res.json({ routes });
    });

    // Server control endpoints
    this.app.post('/api/server/start', (req, res) => {
      try {
        // In web mode, the server is already running, so we just enable mock endpoints
        this.mockServerEnabled = true;
        res.json({ 
          success: true, 
          message: 'Mock server enabled',
          endpoints: Object.keys(this.parsedPaths).length
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to start mock server', message: error.message });
      }
    });

    this.app.post('/api/server/stop', (req, res) => {
      try {
        // Disable mock endpoints but keep web interface running
        this.mockServerEnabled = false;
        res.json({ 
          success: true, 
          message: 'Mock server disabled' 
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to stop mock server', message: error.message });
      }
    });

    this.app.get('/api/server/status', (req, res) => {
      res.json({
        running: this.mockServerEnabled || false,
        endpoints: Object.keys(this.parsedPaths).length,
        port: this.port
      });
    });

    // Endpoint to re-validate current spec
    this.app.get('/api/validate-current-spec', async (req, res) => {
      try {
        if (!this.lastSpecContent || !this.lastSpecType) {
          return res.status(404).json({
            error: 'No spec loaded',
            message: 'No OpenAPI specification is currently loaded for validation'
          });
        }

        // Re-run validation on the current spec
        const SwaggerParser = require('@apidevtools/swagger-parser');
        const SpecValidator = require('./validator');
        const yaml = require('js-yaml');
        
        // Parse the spec from the raw content
        let specObject;
        if (this.lastSpecType === 'yaml') {
          specObject = yaml.load(this.lastSpecContent);
        } else {
          specObject = JSON.parse(this.lastSpecContent);
        }
        
        // Validate the parsed spec
        const parsedSpec = await SwaggerParser.validate(specObject);
        
        const validator = new SpecValidator();
        const validationResults = validator.validateSpec(parsedSpec, this.lastSpecContent, this.lastSpecType);

        console.log('🔍 Re-validation complete:');
        console.log(`  - Quality Score: ${validationResults.qualityScore}%`);
        console.log(`  - Issues: ${validationResults.summary.errors} errors, ${validationResults.summary.warnings} warnings, ${validationResults.summary.suggestions} suggestions`);

        res.json({
          success: true,
          validation: validationResults,
          message: 'Current spec re-validated successfully'
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

      // Check if mock server is enabled
      if (!this.mockServerEnabled) {
        return res.status(503).json({
          error: 'Mock server is disabled',
          message: 'Please enable the mock server to test endpoints',
          timestamp: new Date().toISOString()
        });
      }

      // Find matching route in parsedPaths
      const routeKey = `${req.method} ${req.path}`;
      let matchedRoute = this.parsedPaths[routeKey];
      
      // If not found, try with path parameters
      if (!matchedRoute) {
        for (const [key, routeInfo] of Object.entries(this.parsedPaths)) {
          const [method, path] = key.split(' ', 2);
          if (method === req.method) {
            const expressPath = this._convertOpenAPIPathToExpress(path);
            const pathRegex = new RegExp('^' + expressPath.replace(/:[^/]+/g, '[^/]+') + '$');
            if (pathRegex.test(req.path)) {
              matchedRoute = routeInfo;
              break;
            }
          }
        }
      }
      
      if (matchedRoute) {
        return this._handleRequest(req, res, matchedRoute);
      }
      
      // Continue to next middleware (will eventually hit 404 handler)
      next();
    });

    this.app.get('/_mirage/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        routes: Object.keys(this.parsedPaths).length
      });
    });

    this.app.get('/_mirage/routes', (req, res) => {
      const routes = Object.entries(this.parsedPaths).map(([key, info]) => ({
        route: key,
        path: info.path,
        method: info.method,
        hasRequestBody: !!info.requestBody,
        responseTypes: Object.keys(info.responses || {})
      }));
      
      res.json({ routes });
    });

    // Catch-all route for SPA (must be last)
    if (this.webMode) {
      this.app.get('*', (req, res) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/_mirage/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      });
    }
  }

  _convertOpenAPIPathToExpress(openAPIPath) {
    return openAPIPath.replace(/{([^}]+)}/g, ':$1');
  }

  _handleRequest(req, res, routeInfo) {
    const { method, responses, requestBody } = routeInfo;

    try {
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        return this._handleMutationRequest(req, res, routeInfo);
      } else {
        return this._handleQueryRequest(req, res, routeInfo);
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

  _handleQueryRequest(req, res, routeInfo) {
    const { responses } = routeInfo;
    
    const successResponse = responses['200'] || responses['201'] || responses['default'];
    
    if (successResponse) {
      const responseData = this.generator.generateResponseData(successResponse);
      return res.status(200).json(responseData);
    } else {
      return res.status(200).json({
        message: 'Success',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleMutationRequest(req, res, routeInfo) {
    const { responses, requestBody } = routeInfo;
    
    if (requestBody && Object.keys(req.body).length > 0) {
      const generatedId = this.generator.faker.string.uuid();
      const echoResponse = this.generator.generateRequestEcho(req.body, generatedId);
      return res.status(201).json(echoResponse);
    }
    
    const successResponse = responses['201'] || responses['200'] || responses['default'];
    
    if (successResponse) {
      const responseData = this.generator.generateResponseData(successResponse);
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
        availableRoutes: Object.keys(this.parsedPaths),
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
          console.log(`\n🚀 Mirage mock server running on http://localhost:${this.port}`);
          
          if (this.webMode) {
            console.log(`🌐 Web interface: http://localhost:${this.port}`);
            console.log(`📡 API endpoints: http://localhost:${this.port}/api/*`);
          }
          
          const routeCount = Object.keys(this.parsedPaths).length;
          if (routeCount > 0) {
            console.log(`📋 ${routeCount} mock endpoint${routeCount === 1 ? '' : 's'} available:`);
            
            Object.entries(this.parsedPaths).forEach(([routeKey, routeInfo]) => {
              console.log(`   ${routeKey}`);
            });
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

module.exports = MockServer;