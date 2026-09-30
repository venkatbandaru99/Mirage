/**
 * MirageAPI - OpenAPI Mock Server
 * Copyright (c) 2024 Satya Bandaru. All rights reserved.
 * Licensed under the MIT License. See LICENSE file for details.
 *
 * Validates incoming mock requests against the spec: path parameters, query
 * parameters and the JSON body. Returns a list of problems, or an empty list
 * when the request is valid.
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// OpenAPI formats that JSON Schema / ajv-formats don't define. They are
// descriptive rather than something clients are expected to satisfy exactly,
// so accept any value (int32/int64 are still checked as integers by `type`).
const OPENAPI_FORMATS = ['int32', 'int64', 'float', 'double', 'byte', 'binary', 'password', 'phone'];

function createAjv(options) {
  // multipleOfPrecision: without it 1280.36 fails multipleOf 0.01 due to
  // floating-point division
  const ajv = new Ajv({ allErrors: true, strict: false, multipleOfPrecision: 8, ...options });
  addFormats(ajv);
  OPENAPI_FORMATS.forEach(format => ajv.addFormat(format, true));
  return ajv;
}

// Path and query values arrive as strings, so those validators coerce
// ("42" -> 42, "a" -> ["a"]); bodies are JSON and are checked as sent.
const paramAjv = createAjv({ coerceTypes: 'array' });
const bodyAjv = createAjv({});

// Turn an OpenAPI schema into something ajv accepts:
// - OpenAPI 3.0 boolean exclusiveMinimum/Maximum -> JSON Schema numbers
// - readOnly properties are not required in requests (dropRequiredReadOnly)
// - circular references (from $ref dereferencing) become {} to stop recursion
function toJsonSchema(schema, { dropRequiredReadOnly = false } = {}, seen = new WeakSet(), depth = 0) {
  if (!schema || typeof schema !== 'object') return schema;
  if (seen.has(schema) || depth > 25) return {};
  seen.add(schema);

  const out = Array.isArray(schema) ? [] : {};
  for (const [key, value] of Object.entries(schema)) {
    out[key] = value && typeof value === 'object'
      ? toJsonSchema(value, { dropRequiredReadOnly }, seen, depth + 1)
      : value;
  }

  for (const [bound, exclusive] of [['minimum', 'exclusiveMinimum'], ['maximum', 'exclusiveMaximum']]) {
    if (typeof out[exclusive] === 'boolean') {
      if (out[exclusive] && out[bound] !== undefined) {
        out[exclusive] = out[bound];
        delete out[bound];
      } else {
        delete out[exclusive];
      }
    }
  }

  if (dropRequiredReadOnly && out.properties && Array.isArray(out.required)) {
    out.required = out.required.filter(name => !(out.properties[name] && out.properties[name].readOnly));
  }

  seen.delete(schema);
  return out;
}

function compile(ajv, schema) {
  try {
    return ajv.compile(schema);
  } catch (error) {
    // A schema ajv can't compile shouldn't break mocking - skip validation
    console.warn(`Skipping request validation for a schema ajv can't compile: ${error.message}`);
    return null;
  }
}

function formatErrors(errors, location) {
  return (errors || []).map(error => {
    let path = error.instancePath || '';
    if (error.keyword === 'required') {
      path = `${path}/${error.params.missingProperty}`;
    }
    return { in: location, path: path || '/', message: error.message };
  });
}

// Compiled validators per route
const cache = new WeakMap();

function validatorsFor(route) {
  if (cache.has(route)) return cache.get(route);

  const paramsSchema = location => {
    const params = (route.parameters || []).filter(p => p.in === location);
    if (params.length === 0) return null;
    const properties = {};
    const required = [];
    for (const param of params) {
      properties[param.name] = toJsonSchema(param.schema || { type: 'string' });
      if (param.required || location === 'path') required.push(param.name);
    }
    return { type: 'object', properties, required };
  };

  const pathSchema = paramsSchema('path');
  const querySchema = paramsSchema('query');
  const bodySchema = route.requestBody && route.requestBody.schema
    ? toJsonSchema(route.requestBody.schema, { dropRequiredReadOnly: true })
    : null;

  const validators = {
    path: pathSchema && compile(paramAjv, pathSchema),
    query: querySchema && compile(paramAjv, querySchema),
    body: bodySchema && compile(bodyAjv, bodySchema),
    bodyRequired: Boolean(route.requestBody && route.requestBody.required)
  };
  cache.set(route, validators);
  return validators;
}

/**
 * @param route      parsed route from src/parser.js
 * @param pathParams { name: value } from the matched URL
 * @param query      req.query (MirageAPI's own __ parameters are ignored)
 * @param body       parsed JSON body, or undefined when none was sent
 * @returns array of { in, path, message } - empty when valid
 */
function validateRequest(route, { pathParams = {}, query = {}, body } = {}) {
  const validators = validatorsFor(route);
  const errors = [];

  if (validators.path) {
    const values = { ...pathParams };
    if (!validators.path(values)) errors.push(...formatErrors(validators.path.errors, 'path'));
  }

  if (validators.query) {
    const values = {};
    for (const [name, value] of Object.entries(query)) {
      if (!name.startsWith('__')) values[name] = value;
    }
    if (!validators.query(values)) errors.push(...formatErrors(validators.query.errors, 'query'));
  }

  const hasBody = body !== undefined && body !== null &&
    !(typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0);
  if (!hasBody && validators.bodyRequired) {
    errors.push({ in: 'body', path: '/', message: 'request body is required' });
  } else if (hasBody && validators.body && !validators.body(body)) {
    errors.push(...formatErrors(validators.body.errors, 'body'));
  }

  return errors;
}

module.exports = { validateRequest, toJsonSchema };
