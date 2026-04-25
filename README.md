# 🔮 MirageAPI - OpenAPI Mock Server

A developer productivity tool that accepts an OpenAPI spec and spins up a fully functional local mock server with realistic constraint-aware dummy data.

**Currently Free to Use** - MirageAPI is available at no cost to the developer community.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Custom usage
yarn start --spec your-spec.yaml --port 8080
```

### Railway Deployment
```bash
# Connect to Railway and deploy
railway login
railway link
railway up
```

## 📋 Features

- ✅ **OpenAPI 3.0** spec validation and parsing
- ✅ **Constraint-aware** data generation (minLength, maxLength, enums, patterns)
- ✅ **Dynamic routes** from spec endpoints
- ✅ **Fresh randomized** responses on every request
- ✅ **Request logging** and monitoring
- ✅ **POST/PUT/DELETE** echo with generated IDs

## 🔧 Usage

### CLI
```bash
node src/index.js --spec <spec-file> --port <port>
```

### API Endpoints
Once running, your mock server provides:
- All endpoints from your OpenAPI spec
- `/_mirage/health` - Server health check
- `/_mirage/routes` - List all available routes

## 📁 Project Structure
```
mirage/
├── src/
│   ├── index.js          # CLI entry point
│   ├── parser.js         # OpenAPI spec parser
│   ├── generator.js      # Dummy data generator
│   └── server.js         # Express mock server
├── examples/
│   └── sample-spec.yaml  # Sample OpenAPI spec
└── package.json
```

## 🛠 Tech Stack

- **Node.js** - Runtime
- **Express.js** - Web server
- **@apidevtools/swagger-parser** - OpenAPI validation
- **@faker-js/faker** - Data generation
- **commander** - CLI interface
- **Yarn** - Package manager

## 📄 Example

With the included `sample-spec.yaml`:
```bash
yarn dev
```

Then test endpoints:
```bash
curl http://localhost:3001/customers
curl http://localhost:3001/orders
curl -X POST http://localhost:3001/customers \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'
```

## 🌐 Deploy to Railway

1. Push to GitHub
2. Connect Railway to your repo
3. Set environment variables if needed
4. Deploy automatically

Railway will detect the `yarn.lock` and use Yarn automatically.

## 📜 License

MirageAPI is licensed under the [MIT License](LICENSE).

**Copyright (c) 2024 Satya Bandaru. All rights reserved.**

### Open Source License
- ✅ Free to use, modify, and distribute
- ✅ Commercial use permitted
- ✅ Attribution required (see LICENSE)
- ✅ Subject to MIT License terms

### Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Trademark Notice
"MirageAPI" is a trademark of Satya Bandaru. The open-source license does not grant rights to use the trademark without permission.