const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const SpecValidator = require('./validator');

class SpecParser {
  constructor() {
    this.spec = null;
    this.parsedPaths = {};
    this.validator = new SpecValidator();
    this.validationResults = null;
  }

  async parseSpec(specFilePath) {
    try {
      if (!fs.existsSync(specFilePath)) {
        throw new Error(`Spec file not found: ${specFilePath}`);
      }

      console.log(`Loading OpenAPI spec from: ${specFilePath}`);

      this.spec = await SwaggerParser.validate(specFilePath);
      
      console.log(`✓ Spec loaded and validated successfully`);
      console.log(`  - Title: ${this.spec.info.title || 'Unknown'}`);
      console.log(`  - Version: ${this.spec.info.version || 'Unknown'}`);
      console.log(`  - OpenAPI Version: ${this.spec.openapi}`);

      this._extractPaths();

      return this.spec;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
    }
  }

  async _validateAndParseSpec(specData, originalText = null, fileType = 'yaml') {
    try {
      this.spec = await SwaggerParser.validate(specData);
      
      console.log(`✓ Spec validated successfully`);
      console.log(`  - Title: ${this.spec.info.title || 'Unknown'}`);
      console.log(`  - Version: ${this.spec.info.version || 'Unknown'}`);
      console.log(`  - OpenAPI Version: ${this.spec.openapi}`);

      // Run comprehensive validation
      this.validationResults = this.validator.validateSpec(this.spec, originalText, fileType);
      
      console.log(`✓ Quality analysis complete:`);
      console.log(`  - Quality Score: ${this.validationResults.qualityScore}%`);
      console.log(`  - Issues: ${this.validationResults.summary.errors} errors, ${this.validationResults.summary.warnings} warnings, ${this.validationResults.summary.suggestions} suggestions`);

      this._extractPaths();

      return this.spec;
    } catch (error) {
      throw new Error(`Failed to validate OpenAPI spec: ${error.message}`);
    }
  }

  _extractPaths() {
    this.parsedPaths = {};

    if (!this.spec.paths) {
      console.log('No paths found in spec');
      return;
    }

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const routeKey = `${method.toUpperCase()} ${path}`;
          
          this.parsedPaths[routeKey] = {
            path: path,
            method: method.toUpperCase(),
            operation: operation,
            responses: this._extractResponseSchemas(operation.responses || {}),
            parameters: this._extractParameters(operation.parameters || []),
            requestBody: this._extractRequestBody(operation.requestBody)
          };
        }
      }
    }

    console.log(`✓ Extracted ${Object.keys(this.parsedPaths).length} endpoints:`);
    Object.keys(this.parsedPaths).forEach(route => {
      console.log(`  - ${route}`);
    });
  }

  _extractResponseSchemas(responses) {
    const responseSchemas = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      if (response.content) {
        for (const [mediaType, mediaTypeObject] of Object.entries(response.content)) {
          if (mediaType === 'application/json' && mediaTypeObject.schema) {
            responseSchemas[statusCode] = {
              mediaType,
              schema: this._resolveSchema(mediaTypeObject.schema)
            };
          }
        }
      }
    }

    return responseSchemas;
  }

  _extractParameters(parameters) {
    return parameters.map(param => ({
      name: param.name,
      in: param.in, // path, query, header, cookie
      required: param.required || false,
      schema: this._resolveSchema(param.schema || { type: 'string' })
    }));
  }

  _extractRequestBody(requestBody) {
    if (!requestBody || !requestBody.content) {
      return null;
    }

    for (const [mediaType, mediaTypeObject] of Object.entries(requestBody.content)) {
      if (mediaType === 'application/json' && mediaTypeObject.schema) {
        return {
          mediaType,
          schema: this._resolveSchema(mediaTypeObject.schema),
          required: requestBody.required || false
        };
      }
    }

    return null;
  }

  _resolveSchema(schema) {
    if (schema.$ref) {
      return this._resolveReference(schema.$ref);
    }

    const resolved = { ...schema };

    if (schema.type === 'object' && schema.properties) {
      resolved.properties = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        resolved.properties[propName] = this._resolveSchema(propSchema);
      }
    }

    if (schema.type === 'array' && schema.items) {
      resolved.items = this._resolveSchema(schema.items);
    }

    if (schema.allOf) {
      resolved.allOf = schema.allOf.map(s => this._resolveSchema(s));
    }

    if (schema.anyOf) {
      resolved.anyOf = schema.anyOf.map(s => this._resolveSchema(s));
    }

    if (schema.oneOf) {
      resolved.oneOf = schema.oneOf.map(s => this._resolveSchema(s));
    }

    return resolved;
  }

  _resolveReference(ref) {
    const refPath = ref.replace('#/', '').split('/');
    let resolved = this.spec;
    
    for (const segment of refPath) {
      if (resolved[segment]) {
        resolved = resolved[segment];
      } else {
        console.warn(`Could not resolve reference: ${ref}`);
        return { type: 'object' };
      }
    }

    return this._resolveSchema(resolved);
  }

  getParsedPaths() {
    return this.parsedPaths;
  }

  getSpec() {
    return this.spec;
  }

  getValidationResults() {
    return this.validationResults;
  }
}

module.exports = SpecParser;