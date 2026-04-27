/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const DataGenerator = require('./generator');
const SpecParser = require('./parser');

class MockServer {
  constructor(parsedPaths, options = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.generator = new DataGenerator();
    this.parser = new SpecParser();
    this.webMode = options.webMode || false;
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Session middleware for multi-user support
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'mirage-mock-server-secret',
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
      req.session.mirage = {
        parsedPaths: {},
        mockServerEnabled: false,
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
      
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
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
        const sessionData = this._getSessionData(req);
        
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
          sessionData.parsedPaths = specParser.getParsedPaths();
        } else {
          return res.status(400).json({ error: 'Invalid spec type. Must be yaml or json' });
        }

        const validationResults = specParser.getValidationResults();

        // Store the spec content and type for re-validation in session
        sessionData.lastSpecContent = spec;
        sessionData.lastSpecType = type;

        res.json({
          success: true,
          paths: sessionData.parsedPaths,
          info: specParser.getSpec()?.info || {},
          validation: validationResults,
          sessionId: sessionData.sessionId
        });
      } catch (error) {
        res.status(400).json({
          error: 'Failed to parse OpenAPI spec',
          message: error.message
        });
      }
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
        requestBodySchema: info.requestBody?.schema || null
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
        return res.status(503).json({
          error: 'Mock server is disabled',
          message: 'Please enable the mock server to test endpoints',
          sessionId: sessionData.sessionId,
          timestamp: new Date().toISOString()
        });
      }

      // Find matching route in session's parsedPaths
      const routeKey = `${req.method} ${req.path}`;
      let matchedRoute = sessionData.parsedPaths[routeKey];
      
      // If not found, try with path parameters
      if (!matchedRoute) {
        for (const [key, routeInfo] of Object.entries(sessionData.parsedPaths)) {
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
          
          // Note: Routes are now session-specific and will be shown when users upload specs
          console.log(`📋 Mock endpoints will be available per user session after uploading OpenAPI specs`);
          
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