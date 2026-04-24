const { faker } = require('@faker-js/faker');

class DataGenerator {
  constructor() {
    this.faker = faker;
  }

  generateFromSchema(schema, depth = 0) {
    if (depth > 10) {
      return null;
    }

    if (!schema || typeof schema !== 'object') {
      return this._generateString();
    }

    if (schema.allOf) {
      const merged = this._mergeSchemas(schema.allOf);
      return this.generateFromSchema(merged, depth + 1);
    }

    if (schema.anyOf || schema.oneOf) {
      const options = schema.anyOf || schema.oneOf;
      const randomSchema = options[Math.floor(Math.random() * options.length)];
      return this.generateFromSchema(randomSchema, depth + 1);
    }

    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    switch (schema.type) {
      case 'string':
        return this._generateString(schema);
      case 'integer':
      case 'number':
        return this._generateNumber(schema);
      case 'boolean':
        return this._generateBoolean();
      case 'array':
        return this._generateArray(schema, depth);
      case 'object':
        return this._generateObject(schema, depth);
      default:
        return this._generateString();
    }
  }

  _generateString(schema = {}) {
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
    }

    return value;
  }

  _generateBoolean() {
    return Math.random() < 0.5;
  }

  _generateArray(schema, depth) {
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 5;
    const arrayLength = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    
    const items = [];
    for (let i = 0; i < arrayLength; i++) {
      if (schema.items) {
        items.push(this.generateFromSchema(schema.items, depth + 1));
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
          obj[propName] = this.generateFromSchema(propSchema, depth + 1);
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

  generateResponseData(responseSchema) {
    if (!responseSchema || !responseSchema.schema) {
      return {
        message: "Success",
        data: null,
        timestamp: new Date().toISOString()
      };
    }

    return this.generateFromSchema(responseSchema.schema);
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