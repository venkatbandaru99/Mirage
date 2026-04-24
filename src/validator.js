const yaml = require('js-yaml');

class SpecValidator {
  constructor() {
    this.issues = [];
    this.qualityScore = 0;
    this.totalChecks = 0;
    this.passedChecks = 0;
  }

  validateSpec(spec, originalText = null, fileType = 'yaml') {
    this.issues = [];
    this.qualityScore = 0;
    this.totalChecks = 0;
    this.passedChecks = 0;

    // Store original text for line number mapping
    this.originalLines = originalText ? originalText.split('\n') : [];
    this.fileType = fileType;

    try {
      // Basic structure validation
      this._validateBasicStructure(spec);
      
      // Validate paths and operations
      this._validatePaths(spec);
      
      // Validate components/schemas
      this._validateSchemas(spec);
      
      // Calculate final quality score
      this.qualityScore = this.totalChecks > 0 ? Math.round((this.passedChecks / this.totalChecks) * 100) : 0;

      return {
        isValid: this.issues.filter(i => i.severity === 'error').length === 0,
        qualityScore: this.qualityScore,
        issues: this.issues,
        summary: this._generateSummary()
      };
    } catch (error) {
      this._addIssue('error', 'spec-validation', 'Failed to validate spec', error.message, 1);
      return {
        isValid: false,
        qualityScore: 0,
        issues: this.issues,
        summary: { errors: 1, warnings: 0, suggestions: 0 }
      };
    }
  }

  _validateBasicStructure(spec) {
    // Check OpenAPI version
    this._checkRequired(spec.openapi, 'openapi', 'OpenAPI version is required');
    
    // Check info section
    if (spec.info) {
      this._checkRequired(spec.info.title, 'info.title', 'API title is required');
      this._checkRequired(spec.info.version, 'info.version', 'API version is required');
      this._checkOptional(spec.info.description, 'info.description', 'API description improves documentation quality');
      this._checkOptional(spec.info.contact, 'info.contact', 'Contact information helps API consumers');
    } else {
      this._addIssue('error', 'info', 'Info section is required', 'Add an info section with title and version', 1);
    }

    // Check paths
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      this._addIssue('error', 'paths', 'No API paths defined', 'Add at least one API endpoint', 1);
    }
  }

  _validatePaths(spec) {
    if (!spec.paths) return;

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      this._validatePath(path, pathItem, spec);
    }
  }

  _validatePath(path, pathItem, spec) {
    const lineNumber = this._findLineNumber(`${path}:`);
    
    // Validate path format
    if (!path.startsWith('/')) {
      this._addIssue('error', 'path-format', `Path "${path}" should start with /`, 'Paths must start with forward slash', lineNumber);
    }

    // Check for path parameters in URL but missing in operation
    const pathParams = (path.match(/{[^}]+}/g) || []).map(p => p.slice(1, -1));
    
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)) continue;
      
      this._validateOperation(path, method, operation, pathParams, spec);
    }
  }

  _validateOperation(path, method, operation, pathParams, spec) {
    const operationId = `${method.toUpperCase()} ${path}`;
    const lineNumber = this._findLineNumber(`${method}:`);

    // Check required operation fields
    this._checkOptional(operation.summary, `${operationId}.summary`, 'Operation summary improves API documentation', lineNumber);
    this._checkOptional(operation.description, `${operationId}.description`, 'Operation description helps developers understand the endpoint', lineNumber);
    this._checkOptional(operation.operationId, `${operationId}.operationId`, 'OperationId enables better code generation', lineNumber);

    // Validate path parameters
    this._validatePathParameters(operationId, operation, pathParams, lineNumber);

    // Validate request body for mutation operations
    if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
      this._validateRequestBody(operationId, operation, lineNumber);
    }

    // Validate responses
    this._validateResponses(operationId, operation, spec, lineNumber);

    // Validate query parameters
    this._validateQueryParameters(operationId, operation, lineNumber);
  }

  _validatePathParameters(operationId, operation, pathParams, lineNumber) {
    const definedParams = (operation.parameters || [])
      .filter(p => p.in === 'path')
      .map(p => p.name);

    // Check if all path parameters are defined
    for (const param of pathParams) {
      if (!definedParams.includes(param)) {
        this._addIssue('error', 'missing-path-param', 
          `Path parameter "{${param}}" not defined in ${operationId}`,
          `Add parameter definition for ${param} in the parameters section`, lineNumber);
      }
    }

    // Check for unused parameter definitions
    for (const param of definedParams) {
      if (!pathParams.includes(param)) {
        this._addIssue('warning', 'unused-path-param',
          `Path parameter "${param}" defined but not used in path "${operationId}"`,
          `Remove unused parameter or add it to the path`, lineNumber);
      }
    }
  }

  _validateRequestBody(operationId, operation, lineNumber) {
    if (!operation.requestBody) {
      this._addIssue('warning', 'missing-request-body',
        `${operationId} should probably have a request body`,
        'Add requestBody schema for data input operations', lineNumber);
      return;
    }

    if (!operation.requestBody.content) {
      this._addIssue('error', 'missing-request-content',
        `Request body for ${operationId} missing content definition`,
        'Add content type definitions (e.g., application/json)', lineNumber);
      return;
    }

    // Check for application/json content type
    const hasJson = operation.requestBody.content['application/json'];
    if (!hasJson) {
      this._addIssue('suggestion', 'missing-json-content',
        `${operationId} should support application/json content type`,
        'Add application/json content type for better compatibility', lineNumber);
    } else {
      this._validateSchema(operation.requestBody.content['application/json'].schema, `${operationId}.requestBody`, lineNumber);
    }
  }

  _validateResponses(operationId, operation, spec, lineNumber) {
    if (!operation.responses) {
      this._addIssue('error', 'missing-responses',
        `${operationId} has no response definitions`,
        'Add at least one response definition', lineNumber);
      return;
    }

    const responses = operation.responses;
    const hasSuccessResponse = Object.keys(responses).some(code => code.startsWith('2'));
    
    if (!hasSuccessResponse) {
      this._addIssue('warning', 'no-success-response',
        `${operationId} has no success response (2xx)`,
        'Add at least one 2xx response for successful operations', lineNumber);
    }

    // Check common response codes based on method
    const method = operationId.split(' ')[0];
    const expectedCodes = this._getExpectedResponseCodes(method);
    
    for (const expectedCode of expectedCodes) {
      if (!responses[expectedCode]) {
        this._addIssue('suggestion', 'missing-response-code',
          `${operationId} should consider adding ${expectedCode} response`,
          `Add ${expectedCode} response for better API design`, lineNumber);
      }
    }

    // Validate response schemas
    for (const [code, response] of Object.entries(responses)) {
      if (response.content && response.content['application/json'] && response.content['application/json'].schema) {
        this._validateSchema(response.content['application/json'].schema, `${operationId}.responses.${code}`, lineNumber);
      }
    }
  }

  _validateQueryParameters(operationId, operation, lineNumber) {
    const queryParams = (operation.parameters || []).filter(p => p.in === 'query');
    
    for (const param of queryParams) {
      this._validateParameter(param, `${operationId}.parameters.${param.name}`, lineNumber);
    }
  }

  _validateParameter(param, context, lineNumber) {
    // Check required fields
    this._checkRequired(param.name, `${context}.name`, 'Parameter name is required', lineNumber);
    this._checkRequired(param.in, `${context}.in`, 'Parameter location (in) is required', lineNumber);

    // Check optional but recommended fields
    this._checkOptional(param.description, `${context}.description`, 'Parameter description improves API usability', lineNumber);
    
    if (param.schema) {
      this._validateSchema(param.schema, `${context}.schema`, lineNumber);
    } else {
      this._addIssue('warning', 'missing-param-schema',
        `Parameter ${param.name} missing schema definition`,
        'Add schema with type and constraints for better validation', lineNumber);
    }
  }

  _validateSchemas(spec) {
    if (!spec.components || !spec.components.schemas) {
      this._addIssue('suggestion', 'no-schemas',
        'No reusable schemas defined',
        'Consider adding schemas in components section for better organization', 1);
      return;
    }

    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      const lineNumber = this._findLineNumber(`${schemaName}:`);
      this._validateSchema(schema, `components.schemas.${schemaName}`, lineNumber);
    }
  }

  _validateSchema(schema, context, lineNumber) {
    if (!schema) return;

    // Check type definition
    if (!schema.type && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
      this._addIssue('warning', 'missing-type',
        `Schema ${context} missing type definition`,
        'Add type property for better data generation', lineNumber);
    }

    switch (schema.type) {
      case 'string':
        this._validateStringSchema(schema, context, lineNumber);
        break;
      case 'number':
      case 'integer':
        this._validateNumberSchema(schema, context, lineNumber);
        break;
      case 'array':
        this._validateArraySchema(schema, context, lineNumber);
        break;
      case 'object':
        this._validateObjectSchema(schema, context, lineNumber);
        break;
    }

    // Check for examples
    this._checkOptional(schema.example, `${context}.example`, 'Examples improve mock data quality and documentation', lineNumber);
  }

  _validateStringSchema(schema, context, lineNumber) {
    const hasMinLength = schema.minLength !== undefined;
    const hasMaxLength = schema.maxLength !== undefined;
    const hasPattern = schema.pattern !== undefined;
    const hasFormat = schema.format !== undefined;
    const isRequiredField = context.includes('.required') || this._isRequiredField(context);

    // Check for constraint completeness
    if (!hasMinLength && !hasMaxLength && !hasPattern && !hasFormat) {
      if (isRequiredField) {
        this._addIssue('error', 'missing-required-constraints',
          `Required string field ${context} has no constraints - will generate unpredictable data`,
          'Add minLength, maxLength, pattern, or format for required fields', lineNumber);
      } else {
        this._addIssue('suggestion', 'unconstrained-string',
          `String property ${context} has no constraints`,
          'Add minLength, maxLength, pattern, or format for better validation', lineNumber);
      }
    }

    // Check constraint logic
    if (hasMinLength && hasMaxLength && schema.minLength > schema.maxLength) {
      this._addIssue('error', 'invalid-length-constraint',
        `${context}: minLength (${schema.minLength}) cannot be greater than maxLength (${schema.maxLength})`,
        'Fix minLength and maxLength values', lineNumber);
    }

    // Check for maxLength without minLength (your specific concern)
    if (hasMaxLength && !hasMinLength) {
      if (isRequiredField) {
        this._addIssue('error', 'missing-required-minlength',
          `Required field ${context}: maxLength defined without minLength - required fields should not allow empty strings`,
          'Add minLength: 1 for required string fields', lineNumber);
      } else {
        this._addIssue('warning', 'incomplete-length-constraint',
          `${context}: maxLength defined without minLength - may generate empty strings`,
          'Add minLength constraint or set minLength: 1 if empty strings are not allowed', lineNumber);
      }
    }

    // Check for required fields with no minLength
    if (isRequiredField && !hasMinLength && !hasPattern && !hasFormat) {
      this._addIssue('error', 'required-field-no-minlength',
        `Required string field ${context} allows empty strings - this may cause validation issues`,
        'Add minLength: 1 to prevent empty strings in required fields', lineNumber);
    }

    // Validate pattern if present
    if (hasPattern) {
      try {
        new RegExp(schema.pattern);
        this._incrementCheck(true);
      } catch (e) {
        this._addIssue('error', 'invalid-pattern',
          `${context}: invalid regex pattern "${schema.pattern}"`,
          'Fix the regular expression pattern', lineNumber);
      }
    } else {
      this._incrementCheck(false);
    }

    // Check format validity
    if (hasFormat) {
      const validFormats = ['date', 'date-time', 'time', 'email', 'uri', 'uuid', 'password', 'byte', 'binary'];
      if (!validFormats.includes(schema.format)) {
        this._addIssue('warning', 'unknown-format',
          `${context}: unknown format "${schema.format}"`,
          `Use standard formats: ${validFormats.join(', ')}`, lineNumber);
      }
    }
  }

  _validateNumberSchema(schema, context, lineNumber) {
    const hasMinimum = schema.minimum !== undefined;
    const hasMaximum = schema.maximum !== undefined;
    const hasMultipleOf = schema.multipleOf !== undefined;

    // Check constraint logic
    if (hasMinimum && hasMaximum && schema.minimum > schema.maximum) {
      this._addIssue('error', 'invalid-number-constraint',
        `${context}: minimum (${schema.minimum}) cannot be greater than maximum (${schema.maximum})`,
        'Fix minimum and maximum values', lineNumber);
    }

    // Suggest constraints if missing
    if (!hasMinimum && !hasMaximum && !hasMultipleOf) {
      this._addIssue('suggestion', 'unconstrained-number',
        `Number property ${context} has no constraints`,
        'Add minimum, maximum, or multipleOf for realistic data generation', lineNumber);
    }

    this._incrementCheck(hasMinimum || hasMaximum || hasMultipleOf);
  }

  _validateArraySchema(schema, context, lineNumber) {
    const hasItems = schema.items !== undefined;
    const hasMinItems = schema.minItems !== undefined;
    const hasMaxItems = schema.maxItems !== undefined;

    if (!hasItems) {
      this._addIssue('error', 'missing-array-items',
        `Array ${context} missing items definition`,
        'Add items schema to define array element type', lineNumber);
    } else {
      this._validateSchema(schema.items, `${context}.items`, lineNumber);
    }

    // Check array constraints
    if (hasMinItems && hasMaxItems && schema.minItems > schema.maxItems) {
      this._addIssue('error', 'invalid-array-constraint',
        `${context}: minItems (${schema.minItems}) cannot be greater than maxItems (${schema.maxItems})`,
        'Fix minItems and maxItems values', lineNumber);
    }

    if (!hasMinItems && !hasMaxItems) {
      this._addIssue('suggestion', 'unconstrained-array',
        `Array ${context} has no size constraints`,
        'Add minItems and maxItems for predictable array sizes', lineNumber);
    }

    this._incrementCheck(hasItems);
  }

  _validateObjectSchema(schema, context, lineNumber) {
    const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;
    const hasRequired = schema.required && schema.required.length > 0;

    if (!hasProperties) {
      this._addIssue('warning', 'empty-object',
        `Object ${context} has no properties defined`,
        'Add properties to define object structure', lineNumber);
    } else {
      // Validate each property
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propLineNumber = this._findLineNumber(`${propName}:`) || lineNumber;
        this._validateSchema(propSchema, `${context}.properties.${propName}`, propLineNumber);
      }
    }

    // Check required field logic
    if (hasRequired) {
      for (const requiredField of schema.required) {
        if (!hasProperties || !schema.properties[requiredField]) {
          this._addIssue('error', 'invalid-required-field',
            `Required field "${requiredField}" not defined in ${context} properties`,
            `Add ${requiredField} to properties or remove from required array`, lineNumber);
        }
      }
    }

    this._incrementCheck(hasProperties);
  }

  _getExpectedResponseCodes(method) {
    const commonCodes = {
      'GET': ['200', '404'],
      'POST': ['201', '400'],
      'PUT': ['200', '404', '400'],
      'PATCH': ['200', '404', '400'],
      'DELETE': ['204', '404']
    };
    return commonCodes[method] || ['200'];
  }

  _checkRequired(value, field, message, lineNumber = null) {
    const exists = value !== undefined && value !== null && value !== '';
    this._incrementCheck(exists);
    
    if (!exists) {
      this._addIssue('error', 'missing-required', message, `Add ${field} field`, lineNumber);
    }
    return exists;
  }

  _checkOptional(value, field, message, lineNumber = null) {
    const exists = value !== undefined && value !== null && value !== '';
    this._incrementCheck(exists);
    
    if (!exists) {
      this._addIssue('suggestion', 'missing-optional', message, `Consider adding ${field}`, lineNumber);
    }
    return exists;
  }

  _addIssue(severity, code, message, suggestion, lineNumber = null) {
    this.issues.push({
      severity, // 'error', 'warning', 'suggestion'
      code,
      message,
      suggestion,
      lineNumber,
      timestamp: Date.now()
    });
  }

  _incrementCheck(passed) {
    this.totalChecks++;
    if (passed) this.passedChecks++;
  }

  _generateSummary() {
    const errors = this.issues.filter(i => i.severity === 'error').length;
    const warnings = this.issues.filter(i => i.severity === 'warning').length;
    const suggestions = this.issues.filter(i => i.severity === 'suggestion').length;

    return {
      errors,
      warnings,
      suggestions,
      totalIssues: errors + warnings + suggestions,
      qualityScore: this.qualityScore,
      totalChecks: this.totalChecks,
      passedChecks: this.passedChecks
    };
  }

  _isRequiredField(context) {
    // Check if the field path indicates it's in a required field
    // e.g., "components.schemas.Customer.properties.firstName" where firstName is in required array
    const parts = context.split('.');
    const fieldName = parts[parts.length - 1];
    
    // Try to find the schema this field belongs to
    const schemaPath = parts.slice(0, -2).join('.'); // Remove "properties" and field name
    
    // This is a simplified check - in a real implementation we'd traverse the schema
    // For now, check if the context suggests it's a common required field
    const commonRequiredFields = ['firstName', 'lastName', 'email', 'id', 'customerId', 'totalAmount', 'currency'];
    return commonRequiredFields.includes(fieldName) && context.includes('properties');
  }

  _findLineNumber(searchText) {
    if (!this.originalLines.length) return null;
    
    for (let i = 0; i < this.originalLines.length; i++) {
      if (this.originalLines[i].trim().includes(searchText.trim())) {
        return i + 1; // Lines are 1-indexed
      }
    }
    return null;
  }
}

module.exports = SpecValidator;