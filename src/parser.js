const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const SpecValidator = require('./validator');

// application/json, application/problem+json, etc.
function isJsonMediaType(mediaType) {
  return mediaType === 'application/json' || /\+json$/.test(mediaType);
}

// The media type's `example`, or the value of its first named `examples` entry
function firstExample(mediaTypeObject) {
  if (mediaTypeObject.example !== undefined) {
    return mediaTypeObject.example;
  }
  const named = Object.values(mediaTypeObject.examples || {})[0];
  return named && named.value !== undefined ? named.value : undefined;
}

// Swagger 2.0 non-body parameters carry their type keywords directly
// (type: integer, enum, minimum...) instead of in a `schema` object
function swagger2ParamSchema(param) {
  const keys = ['type', 'format', 'items', 'enum', 'minimum', 'maximum', 'exclusiveMinimum',
    'exclusiveMaximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'multipleOf'];
  const schema = {};
  for (const key of keys) {
    if (param[key] !== undefined) schema[key] = param[key];
  }
  if (!schema.type) schema.type = 'string';
  return schema;
}

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
      console.log(`  - OpenAPI Version: ${this.getSpecVersion()}`);

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
      console.log(`  - OpenAPI Version: ${this.getSpecVersion()}`);

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

    // Swagger 2.0 puts response schemas directly on the response and the
    // request body in an `in: body` parameter; OpenAPI 3 uses `content`.
    const isSwagger2 = this.spec.swagger === '2.0';

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const routeKey = `${method.toUpperCase()} ${path}`;
          const parameters = this._mergeParameters(pathItem.parameters, operation.parameters);
          
          this.parsedPaths[routeKey] = {
            path: path,
            method: method.toUpperCase(),
            operation: operation,
            tags: operation.tags || [],
            summary: operation.summary,
            responses: this._extractResponseSchemas(operation.responses || {}, isSwagger2),
            parameters: this._extractParameters(parameters.filter(p => p.in !== 'body' && p.in !== 'formData')),
            requestBody: isSwagger2
              ? this._extractSwagger2Body(parameters)
              : this._extractRequestBody(operation.requestBody)
          };
        }
      }
    }

    console.log(`✓ Extracted ${Object.keys(this.parsedPaths).length} endpoints:`);
    Object.keys(this.parsedPaths).forEach(route => {
      console.log(`  - ${route}`);
    });
  }

  // Every status code the spec defines is kept (so status simulation knows
  // about e.g. 204 or 404 even without a body). `schema` is the JSON body
  // schema or null; `example` is the spec's example for that response, if any.
  _extractResponseSchemas(responses, isSwagger2 = false) {
    const responseSchemas = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      const entry = { mediaType: null, schema: null, example: undefined };

      if (isSwagger2) {
        if (response.schema) {
          entry.mediaType = 'application/json';
          entry.schema = this._resolveSchema(response.schema);
        }
        if (response.examples && response.examples['application/json'] !== undefined) {
          entry.example = response.examples['application/json'];
        }
      } else if (response.content) {
        const jsonType = Object.keys(response.content).find(isJsonMediaType);
        if (jsonType) {
          const mediaTypeObject = response.content[jsonType];
          entry.mediaType = jsonType;
          entry.schema = mediaTypeObject.schema ? this._resolveSchema(mediaTypeObject.schema) : null;
          entry.example = firstExample(mediaTypeObject);
        }
      }

      responseSchemas[statusCode] = entry;
    }

    return responseSchemas;
  }

  // Path-level parameters apply to every operation; operation-level ones
  // override them by name + location.
  _mergeParameters(pathParams = [], operationParams = []) {
    const merged = new Map();
    for (const param of [...(pathParams || []), ...(operationParams || [])]) {
      merged.set(`${param.in}:${param.name}`, param);
    }
    return [...merged.values()];
  }

  _extractSwagger2Body(parameters) {
    const bodyParam = parameters.find(p => p.in === 'body' && p.schema);
    if (!bodyParam) {
      return null;
    }
    return {
      mediaType: 'application/json',
      schema: this._resolveSchema(bodyParam.schema),
      required: bodyParam.required || false
    };
  }

  _extractParameters(parameters) {
    return parameters.map(param => ({
      name: param.name,
      in: param.in, // path, query, header, cookie
      required: param.required || false,
      schema: this._resolveSchema(param.schema || swagger2ParamSchema(param))
    }));
  }

  _extractRequestBody(requestBody) {
    if (!requestBody || !requestBody.content) {
      return null;
    }

    for (const [mediaType, mediaTypeObject] of Object.entries(requestBody.content)) {
      if (isJsonMediaType(mediaType) && mediaTypeObject.schema) {
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

  // e.g. "3.0.3" or "2.0"
  getSpecVersion() {
    return this.spec?.openapi || this.spec?.swagger || 'unknown';
  }

  getValidationResults() {
    return this.validationResults;
  }
}

module.exports = SpecParser;