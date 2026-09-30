const { faker } = require('@faker-js/faker');

// Field name (lowercase, without _ or -) -> realistic value generator
const FIELD_NAME_GENERATORS = {
  firstname: f => f.person.firstName(),
  givenname: f => f.person.firstName(),
  lastname: f => f.person.lastName(),
  surname: f => f.person.lastName(),
  familyname: f => f.person.lastName(),
  name: f => f.person.fullName(),
  fullname: f => f.person.fullName(),
  displayname: f => f.person.fullName(),
  username: f => f.internet.userName(),
  jobtitle: f => f.person.jobTitle(),
  email: f => f.internet.email(),
  emailaddress: f => f.internet.email(),
  phone: f => f.phone.number(),
  phonenumber: f => f.phone.number(),
  mobile: f => f.phone.number(),
  street: f => f.location.streetAddress(),
  streetaddress: f => f.location.streetAddress(),
  address: f => f.location.streetAddress(),
  addressline1: f => f.location.streetAddress(),
  city: f => f.location.city(),
  state: f => f.location.state(),
  province: f => f.location.state(),
  country: f => f.location.country(),
  countrycode: f => f.location.countryCode(),
  zip: f => f.location.zipCode(),
  zipcode: f => f.location.zipCode(),
  postalcode: f => f.location.zipCode(),
  postcode: f => f.location.zipCode(),
  company: f => f.company.name(),
  companyname: f => f.company.name(),
  organization: f => f.company.name(),
  productname: f => f.commerce.productName(),
  department: f => f.commerce.department(),
  description: f => f.lorem.sentence(),
  bio: f => f.lorem.sentence(),
  url: f => f.internet.url(),
  website: f => f.internet.url(),
  avatar: f => f.image.avatar(),
  avatarurl: f => f.image.avatar(),
  imageurl: f => f.image.url(),
  color: f => f.color.human(),
  currency: f => f.finance.currencyCode(),
  currencycode: f => f.finance.currencyCode(),
  iban: f => f.finance.iban(),
  ipaddress: f => f.internet.ip()
};

// Keys that are safe to match as a suffix (billingCity, homePhone, ...).
// Longest first so e.g. "productname" wins over shorter keys.
const NAME_SUFFIXES = [
  'productname', 'companyname', 'firstname', 'lastname', 'postalcode',
  'zipcode', 'username', 'country', 'street', 'email', 'phone', 'city', 'url'
];

// True if a schema or anything nested inside it carries an example
function hasExample(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 10) return false;
  if (schema.example !== undefined || (Array.isArray(schema.examples) && schema.examples.length)) return true;
  if (schema.items && hasExample(schema.items, depth + 1)) return true;
  return Object.values(schema.properties || {}).some(p => hasExample(p, depth + 1));
}

class DataGenerator {
  constructor() {
    this.faker = faker;
  }

  // fieldName is the property name this schema belongs to (if any). It lets
  // plain strings like `firstName` or `city` get realistic values instead of
  // lorem ipsum - see _generateFromFieldName.
  generateFromSchema(schema, depth = 0, fieldName = undefined) {
    if (depth > 10) {
      return null;
    }

    if (!schema || typeof schema !== 'object') {
      return this._generateString();
    }

    if (schema.allOf) {
      const merged = this._mergeSchemas(schema.allOf);
      return this.generateFromSchema(merged, depth + 1, fieldName);
    }

    if (schema.anyOf || schema.oneOf) {
      const options = schema.anyOf || schema.oneOf;
      const randomSchema = options[Math.floor(Math.random() * options.length)];
      return this.generateFromSchema(randomSchema, depth + 1, fieldName);
    }

    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    switch (schema.type) {
      case 'string':
        return this._generateString(schema, fieldName);
      case 'integer':
      case 'number':
        return this._generateNumber(schema);
      case 'boolean':
        return this._generateBoolean();
      case 'array':
        return this._generateArray(schema, depth, fieldName);
      case 'object':
        return this._generateObject(schema, depth);
      default:
        return this._generateString();
    }
  }

  _generateString(schema = {}, fieldName = undefined) {
    const { format, minLength, maxLength, pattern } = schema;

    if (format) {
      switch (format) {
        case 'email':
          return this.faker.internet.email();
        case 'uri':
        case 'url':
          return this.faker.internet.url();
        case 'uuid':
          return this.faker.string.uuid();
        case 'date':
          return this.faker.date.past().toISOString().split('T')[0];
        case 'date-time':
          return this.faker.date.past().toISOString();
        case 'time':
          return this.faker.date.recent().toTimeString().split(' ')[0];
        case 'password':
          return this.faker.internet.password();
        case 'byte':
          return Buffer.from(this.faker.lorem.word()).toString('base64');
        case 'binary':
          return this.faker.string.hexadecimal({ length: 32 });
        case 'phone':
          return this.faker.phone.number();
        default:
          return this._generateStringWithConstraints(minLength, maxLength);
      }
    }

    // No explicit format: use the field name for a realistic value, as long
    // as it still satisfies the schema's length and pattern constraints
    const byName = this._generateFromFieldName(fieldName);
    if (byName !== undefined && this._satisfiesStringConstraints(byName, schema)) {
      return byName;
    }

    if (pattern) {
      try {
        return this._generateFromPattern(pattern);
      } catch (error) {
        console.warn(`Could not generate string from pattern: ${pattern}`);
        return this._generateStringWithConstraints(minLength, maxLength);
      }
    }

    return this._generateStringWithConstraints(minLength, maxLength);
  }

  _generateStringWithConstraints(minLength, maxLength) {
    const min = minLength || 5;
    const max = maxLength || 50;
    
    const length = Math.floor(Math.random() * (max - min + 1)) + min;
    
    if (length <= 10) {
      return this.faker.lorem.word().substring(0, length).padEnd(length, 'a');
    } else if (length <= 30) {
      return this.faker.lorem.words(Math.ceil(length / 6)).substring(0, length);
    } else {
      return this.faker.lorem.sentence().substring(0, length);
    }
  }

  _generateFromPattern(pattern) {
    // First try faker's regex generator. It doesn't understand anchors, \d,
    // \w or groups, so simplify those, and only keep the result if it really
    // matches the original pattern.
    try {
      const simplified = pattern
        .replace(/^\^/, '')
        .replace(/\$$/, '')
        .replace(/\\d/g, '[0-9]')
        .replace(/\\w/g, '[a-zA-Z0-9_]')
        .replace(/\([^()]*\)\?/g, '');   // drop optional groups like (-[0-9]{4})?
      const candidate = this.faker.helpers.fromRegExp(simplified);
      if (new RegExp(pattern).test(candidate)) {
        return candidate;
      }
    } catch (error) {
      // Unsupported syntax - fall through to the heuristics below
    }

    const simplePatterns = {
      '^[A-Z]{2,3}$': () => this.faker.string.alpha({ length: { min: 2, max: 3 }, casing: 'upper' }),
      '^[a-z]+$': () => this.faker.string.alpha({ length: { min: 3, max: 10 }, casing: 'lower' }),
      '^[A-Z]+$': () => this.faker.string.alpha({ length: { min: 3, max: 10 }, casing: 'upper' }),
      '^[0-9]+$': () => this.faker.string.numeric(5),
      '^[a-zA-Z0-9]+$': () => this.faker.string.alphanumeric(8),
      '^\\d{4}$': () => this.faker.string.numeric(4),
      '^\\d{2,4}$': () => this.faker.string.numeric(Math.floor(Math.random() * 3) + 2)
    };

    for (const [pat, generator] of Object.entries(simplePatterns)) {
      if (pattern === pat) {
        return generator();
      }
    }

    if (pattern.includes('[0-9]') || pattern.includes('\\d')) {
      return this.faker.string.numeric(5);
    }
    if (pattern.includes('[a-zA-Z]')) {
      return this.faker.lorem.word();
    }

    return this.faker.lorem.word();
  }

  // Realistic values for common field names on plain strings (no format).
  // Names are normalized (lowercase, no _ or -) and matched exactly, or by
  // suffix for the unambiguous keys in NAME_SUFFIXES (e.g. billingCity).
  // Returns undefined when nothing matches.
  _generateFromFieldName(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      return undefined;
    }

    // customerId, user_id, orderID -> UUID
    if (/(^id$|[a-z0-9]Id$|_id$|ID$)/.test(fieldName)) {
      return this.faker.string.uuid();
    }

    const key = fieldName.toLowerCase().replace(/[_-]/g, '');
    const generator = FIELD_NAME_GENERATORS[key] ||
      FIELD_NAME_GENERATORS[NAME_SUFFIXES.find(suffix => key.endsWith(suffix))];

    return generator ? generator(this.faker) : undefined;
  }

  _satisfiesStringConstraints(value, schema = {}) {
    const { minLength, maxLength, pattern } = schema;
    if (minLength !== undefined && value.length < minLength) return false;
    if (maxLength !== undefined && value.length > maxLength) return false;
    if (pattern) {
      try {
        return new RegExp(pattern).test(value);
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  _generateNumber(schema = {}) {
    const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = schema;
    
    let min = minimum !== undefined ? minimum : 0;
    let max = maximum !== undefined ? maximum : 1000;
    
    if (exclusiveMinimum !== undefined) {
      min = exclusiveMinimum + (schema.type === 'integer' ? 1 : 0.01);
    }
    if (exclusiveMaximum !== undefined) {
      max = exclusiveMaximum - (schema.type === 'integer' ? 1 : 0.01);
    }

    let value;
    if (schema.type === 'integer') {
      value = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      value = Math.random() * (max - min) + min;
      value = Math.round(value * 100) / 100;
    }

    if (multipleOf) {
      value = Math.round(value / multipleOf) * multipleOf;
      // Trim float noise (e.g. 3599.4300000000003 for multipleOf 0.01)
      const decimals = (String(multipleOf).split('.')[1] || '').length;
      value = Number(value.toFixed(decimals));
    }

    return value;
  }

  _generateBoolean() {
    return Math.random() < 0.5;
  }

  _generateArray(schema, depth, fieldName) {
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 5;
    const arrayLength = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    
    const items = [];
    for (let i = 0; i < arrayLength; i++) {
      if (schema.items) {
        items.push(this.generateFromSchema(schema.items, depth + 1, fieldName));
      } else {
        items.push(this._generateString());
      }
    }
    
    return items;
  }

  _generateObject(schema, depth) {
    const obj = {};
    
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required && schema.required.includes(propName);
        const shouldInclude = isRequired || Math.random() > 0.3;
        
        if (shouldInclude) {
          obj[propName] = this.generateFromSchema(propSchema, depth + 1, propName);
        }
      }
    }

    if (Object.keys(obj).length === 0) {
      obj.id = this.faker.string.uuid();
      obj.name = this.faker.person.fullName();
      obj.value = this.faker.lorem.sentence();
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const extraProps = Math.floor(Math.random() * 3);
      for (let i = 0; i < extraProps; i++) {
        const propName = this.faker.lorem.word();
        obj[propName] = this.generateFromSchema(schema.additionalProperties, depth + 1);
      }
    }

    return obj;
  }

  _mergeSchemas(schemas) {
    const merged = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const schema of schemas) {
      if (schema.type && !merged.type) {
        merged.type = schema.type;
      }
      
      if (schema.properties) {
        Object.assign(merged.properties, schema.properties);
      }
      
      if (schema.required) {
        merged.required.push(...schema.required);
      }
    }

    return merged;
  }

  // responseSchema is a parser response entry: { schema, example }.
  // With useExamples, the spec's response-level example wins, then
  // schema/property-level examples (see generateFromExamples).
  generateResponseData(responseSchema, { useExamples = false } = {}) {
    if (useExamples && responseSchema && responseSchema.example !== undefined) {
      return responseSchema.example;
    }

    if (!responseSchema || !responseSchema.schema) {
      return {
        message: "Success",
        data: null,
        timestamp: new Date().toISOString()
      };
    }

    return useExamples
      ? this.generateFromExamples(responseSchema.schema)
      : this.generateFromSchema(responseSchema.schema);
  }

  // Build a value from the `example` keywords in a schema: a schema-level
  // example is used as-is; objects take each property's example; required
  // properties without one are generated; arrays hold a single item. Anything
  // with no example at all falls back to normal generation.
  generateFromExamples(schema, depth = 0, fieldName = undefined) {
    if (!schema || typeof schema !== 'object' || depth > 10) {
      return this.generateFromSchema(schema, depth, fieldName);
    }
    if (schema.example !== undefined) {
      return schema.example;
    }
    if (Array.isArray(schema.examples) && schema.examples.length > 0) {
      return schema.examples[0]; // OpenAPI 3.1 / JSON Schema style
    }
    if (schema.allOf) {
      return this.generateFromExamples(this._mergeSchemas(schema.allOf), depth + 1, fieldName);
    }
    if (schema.oneOf || schema.anyOf) {
      return this.generateFromExamples((schema.oneOf || schema.anyOf)[0], depth + 1, fieldName);
    }
    if (schema.type === 'array' && schema.items) {
      return [this.generateFromExamples(schema.items, depth + 1, fieldName)];
    }
    if (schema.type === 'object' || schema.properties) {
      const obj = {};
      const required = schema.required || [];
      for (const [propName, propSchema] of Object.entries(schema.properties || {})) {
        if (required.includes(propName) || hasExample(propSchema)) {
          obj[propName] = this.generateFromExamples(propSchema, depth + 1, propName);
        }
      }
      return obj;
    }
    return this.generateFromSchema(schema, depth, fieldName);
  }

  generateRequestEcho(requestBody, generatedId = null) {
    const echo = { ...requestBody };
    
    if (generatedId) {
      echo.id = generatedId;
    } else if (!echo.id) {
      echo.id = this.faker.string.uuid();
    }
    
    if (!echo.createdAt) {
      echo.createdAt = new Date().toISOString();
    }
    
    return echo;
  }
}

module.exports = DataGenerator;