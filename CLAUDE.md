You are helping me build a tool called mirage — a developer productivity tool that accepts an OpenAPI spec and spins up a fully functional local mock server with realistic constraint-aware dummy data.

## Project Context

This is a proof of concept for an API aggregation consulting use case. The core problem:
- Developers building microservices need to integrate with upstream systems
- They cannot access real systems during development due to security/compliance restrictions
- Existing mock tools like WireMock and Prism are clunky to configure
- This tool makes it dead simple: drop in a spec, get a running mock server instantly

## What We Are Building (POC Scope Only)

A Node.js CLI tool and lightweight local server that:

1. **Spec Ingestion** — Accepts a single OpenAPI 3.0 spec in JSON or YAML format via CLI argument
2. **Spec Parser** — Reads all paths, HTTP methods, request parameters, response schemas, field types, formats, constraints (minLength, maxLength, minimum, maximum, pattern, enum)
3. **Data Generator** — Generates realistic dummy data per field respecting all constraints using Faker.js
4. **Mock Server** — Spins up an Express.js server dynamically with all endpoints from the spec live and responding
5. **Randomized Responses** — Every API call returns freshly generated data, not hardcoded examples

## Tech Stack

- Node.js
- Express.js for the mock server
- js-yaml for YAML parsing
- @apidevtools/swagger-parser for OpenAPI spec validation and parsing
- @faker-js/faker for constraint-aware data generation
- commander for CLI argument handling

## Project Structure To Create

mirage/
├── src/
│   ├── index.js          # CLI entry point
│   ├── parser.js         # OpenAPI spec parser
│   ├── generator.js      # Dummy data generator
│   └── server.js         # Express mock server builder
├── examples/
│   └── sample-spec.yaml  # A sample OpenAPI spec for testing
├── package.json
└── README.md

## Detailed Behavior Expected

**CLI Usage:**

node src/index.js --spec ./examples/sample-spec.yaml --port 3000

**Parser behavior:**
- Read spec file from path argument
- Validate it is a valid OpenAPI 3.0 spec
- Extract every path + method combination
- For each response schema, extract all fields with their type, format, and constraints

**Generator behavior:**
- string + no format → random sentence or word
- string + format email → valid fake email
- string + format date → valid fake date string
- string + format uuid → valid UUID
- string + minLength/maxLength → string respecting those bounds
- string + pattern → attempt regex-based generation or fallback to random string
- string + enum → randomly pick one value from enum array
- integer/number + minimum/maximum → random number within bounds
- boolean → random true or false
- array → generate 2-5 items of the item schema type
- object → recursively generate all nested fields

**Server behavior:**
- For every path in the spec, register the corresponding Express route
- On each request, call the generator fresh to produce new randomized data
- Return the generated data as JSON with status 200
- Log each incoming request to console: method, path, timestamp
- Print all available endpoints on server startup

## Sample Spec To Include

Create a sample-spec.yaml that represents a realistic customer-order API with:
- GET /customers — returns array of customers
- GET /customers/{id} — returns single customer
- POST /customers — accepts customer body, returns created customer
- GET /orders — returns array of orders
- GET /orders/{id} — returns single order

Each customer should have: id (uuid), firstName, lastName, email, phone, age (18-80), status (enum: active/inactive/pending), createdAt (date-time)

Each order should have: id (uuid), customerId (uuid), totalAmount (number 0-10000), currency (enum: USD/EUR/GBP), status (enum: pending/processing/shipped/delivered/cancelled), createdAt (date-time)

## Success Criteria

When I run the CLI command, I should see:
- Spec loaded and validated message
- List of all registered endpoints printed
- Server running message with port
- When I hit any endpoint via curl or Postman, I get realistic randomized JSON back
- Every call returns different data

## Important Constraints

- Keep it simple — no database, no persistence, purely in-memory stateless responses
- No authentication on the mock server
- No UI needed — CLI only for this POC
- Focus on GET endpoints working perfectly first, POST/PUT/DELETE can return the request body echoed back with a generated ID added
- Add clear comments in code explaining each section for future extension

Start by creating the project structure, installing dependencies, then build each module one at a time starting with parser.js, then generator.js, then server.js, then index.js. Test with the sample spec before finishing.