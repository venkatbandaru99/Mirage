/**
 * Smart OpenAPI Generator
 * Uses pattern matching and templates instead of AI models for better reliability
 */

interface ResourcePattern {
  keywords: string[];
  resource: string;
  endpoints: EndpointTemplate[];
  schemas: SchemaTemplate[];
}

interface EndpointTemplate {
  path: string;
  method: string;
  summary: string;
  description: string;
  requestBody?: any;
  responses: any;
}

interface SchemaTemplate {
  name: string;
  properties: any;
}

export class SmartSpecGenerator {
  private patterns: ResourcePattern[] = [
    {
      keywords: ['invoice', 'billing', 'bill', 'payment'],
      resource: 'invoices',
      endpoints: [
        {
          path: '/invoices',
          method: 'get',
          summary: 'List all invoices',
          description: 'Retrieve a list of all invoices',
          responses: {
            '200': {
              description: 'List of invoices',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Invoice' }
                  }
                }
              }
            }
          }
        },
        {
          path: '/invoices/{id}',
          method: 'get',
          summary: 'Get invoice by ID',
          description: 'Retrieve a specific invoice by its ID',
          responses: {
            '200': {
              description: 'Invoice details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Invoice' }
                }
              }
            },
            '404': {
              description: 'Invoice not found'
            }
          }
        },
        {
          path: '/invoices',
          method: 'post',
          summary: 'Create new invoice',
          description: 'Create a new invoice',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateInvoice' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Invoice created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Invoice' }
                }
              }
            }
          }
        },
        {
          path: '/invoices/{id}',
          method: 'put',
          summary: 'Update invoice',
          description: 'Update an existing invoice',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateInvoice' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Invoice updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Invoice' }
                }
              }
            }
          }
        },
        {
          path: '/invoices/{id}',
          method: 'delete',
          summary: 'Delete invoice',
          description: 'Delete an invoice by ID',
          responses: {
            '204': {
              description: 'Invoice deleted successfully'
            },
            '404': {
              description: 'Invoice not found'
            }
          }
        }
      ],
      schemas: [
        {
          name: 'Invoice',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            invoiceNumber: {
              type: 'string',
              example: 'INV-2024-001'
            },
            customerName: {
              type: 'string',
              example: 'John Doe'
            },
            amount: {
              type: 'number',
              format: 'float',
              example: 1299.99
            },
            tax: {
              type: 'number',
              format: 'float',
              example: 129.99
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue'],
              example: 'sent'
            },
            issueDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              example: '2024-02-15'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          },
          required: ['invoiceNumber', 'customerName', 'amount', 'status', 'issueDate', 'dueDate']
        },
        {
          name: 'CreateInvoice',
          properties: {
            invoiceNumber: {
              type: 'string',
              example: 'INV-2024-001'
            },
            customerName: {
              type: 'string',
              example: 'John Doe'
            },
            amount: {
              type: 'number',
              format: 'float',
              example: 1299.99
            },
            tax: {
              type: 'number',
              format: 'float',
              example: 129.99
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue'],
              example: 'draft'
            },
            issueDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              example: '2024-02-15'
            }
          },
          required: ['invoiceNumber', 'customerName', 'amount', 'issueDate', 'dueDate']
        },
        {
          name: 'UpdateInvoice',
          properties: {
            customerName: {
              type: 'string',
              example: 'John Doe'
            },
            amount: {
              type: 'number',
              format: 'float',
              example: 1299.99
            },
            tax: {
              type: 'number',
              format: 'float',
              example: 129.99
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue'],
              example: 'paid'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              example: '2024-02-15'
            }
          }
        }
      ]
    },
    // Add more patterns for other resources like users, orders, products, etc.
    {
      keywords: ['user', 'customer', 'client', 'account'],
      resource: 'users',
      endpoints: [
        {
          path: '/users',
          method: 'get',
          summary: 'List all users',
          description: 'Retrieve a list of all users',
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        },
        {
          path: '/users/{id}',
          method: 'get',
          summary: 'Get user by ID',
          description: 'Retrieve a specific user by their ID',
          responses: {
            '200': {
              description: 'User details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        {
          path: '/users',
          method: 'post',
          summary: 'Create new user',
          description: 'Create a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateUser' }
              }
            }
          },
          responses: {
            '201': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        }
      ],
      schemas: [
        {
          name: 'User',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            phone: {
              type: 'string',
              example: '+1-555-0123'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          },
          required: ['firstName', 'lastName', 'email']
        },
        {
          name: 'CreateUser',
          properties: {
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            phone: {
              type: 'string',
              example: '+1-555-0123'
            }
          },
          required: ['firstName', 'lastName', 'email']
        }
      ]
    }
  ];

  detectResource(description: string): ResourcePattern | null {
    const lowerDesc = description.toLowerCase();
    
    for (const pattern of this.patterns) {
      if (pattern.keywords.some(keyword => lowerDesc.includes(keyword))) {
        return pattern;
      }
    }
    
    return null; // No pattern matched
  }

  generateOpenAPISpec(description: string): string {
    const pattern = this.detectResource(description);
    
    if (!pattern) {
      // Fall back to generic template
      return this.generateGenericSpec(description);
    }

    const timestamp = new Date().toISOString();
    const safeDescription = this.sanitizeDescription(description);
    
    // Build paths
    const paths: any = {};
    for (const endpoint of pattern.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      paths[endpoint.path][endpoint.method] = {
        summary: endpoint.summary,
        description: endpoint.description,
        ...(endpoint.requestBody && { requestBody: endpoint.requestBody }),
        responses: endpoint.responses
      };
    }
    
    // Build schemas
    const schemas: any = {};
    for (const schema of pattern.schemas) {
      schemas[schema.name] = {
        type: 'object',
        properties: schema.properties,
        ...(schema.properties.required && { required: schema.properties.required })
      };
    }

    const spec = {
      openapi: '3.0.0',
      info: {
        title: `Generated ${pattern.resource.charAt(0).toUpperCase() + pattern.resource.slice(1)} API`,
        version: '1.0.0',
        description: safeDescription
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Local development server'
        }
      ],
      paths,
      components: {
        schemas
      }
    };

    // Convert to YAML-like string (simplified)
    return this.objectToYaml(spec);
  }

  private sanitizeDescription(description: string): string {
    return description
      .replace(/"/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .trim();
  }

  private generateGenericSpec(description: string): string {
    const timestamp = new Date().toISOString();
    const safeDescription = this.sanitizeDescription(description);

    return `openapi: 3.0.0
info:
  title: Generated API
  version: 1.0.0
  description: "${safeDescription}"
  
servers:
  - url: http://localhost:3001
    description: Local development server

paths:
  /health:
    get:
      summary: Health check endpoint
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  timestamp:
                    type: string
                    example: "${timestamp}"

  /items:
    get:
      summary: Get all items
      responses:
        '200':
          description: List of items
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Item'
    post:
      summary: Create new item
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateItem'
      responses:
        '201':
          description: Item created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Item'

components:
  schemas:
    Item:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        createdAt:
          type: string
          format: date-time
      required:
        - name
    CreateItem:
      type: object
      properties:
        name:
          type: string
      required:
        - name`;
  }

  private objectToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.objectToYaml(item, indent + 2).split('\n').map(line => line ? `  ${line}` : '').join('\n');
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYaml(value, indent + 1);
      }
    }

    return yaml;
  }
}

export const smartGenerator = new SmartSpecGenerator();