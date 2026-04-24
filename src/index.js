#!/usr/bin/env node

const { Command } = require('commander');
const SpecParser = require('./parser');
const MockServer = require('./server');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('mirage')
  .description('A developer productivity tool that spins up mock servers from OpenAPI specs')
  .version('1.0.0');

program
  .option('-s, --spec <file>', 'OpenAPI spec file (JSON or YAML)')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-w, --web', 'Enable web interface mode')
  .option('--no-cors', 'Disable CORS headers')
  .option('--quiet', 'Suppress non-error output')
  .action(async (options) => {
    try {
      if (options.web) {
        await startWebServer(options);
      } else {
        await startMockServer(options);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

async function startMockServer(options) {
  if (!options.spec) {
    throw new Error('OpenAPI spec file is required. Use --spec <file>');
  }

  const specPath = path.resolve(options.spec);
  
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  const port = parseInt(options.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Port must be a number between 1 and 65535');
  }

  if (!options.quiet) {
    console.log('🔮 Mirage - OpenAPI Mock Server');
    console.log('================================\n');
  }

  const parser = new SpecParser();
  await parser.parseSpec(specPath);
  
  const parsedPaths = parser.getParsedPaths();
  
  if (Object.keys(parsedPaths).length === 0) {
    console.log('⚠️  No endpoints found in the spec. Server will start but no routes will be available.');
  }

  const server = new MockServer(parsedPaths, { port });
  
  const serverInstance = await server.start();
  
  const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down mock server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  return serverInstance;
}

async function startWebServer(options) {
  const port = parseInt(options.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('Port must be a number between 1 and 65535');
  }

  if (!options.quiet) {
    console.log('🔮 Mirage - Web Interface Mode');
    console.log('==============================\n');
  }

  // Start with empty paths for web mode - users will upload specs
  const server = new MockServer({}, { port, webMode: true });
  
  const serverInstance = await server.start();
  
  const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down web server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  return serverInstance;
}

if (require.main === module) {
  program.parse();
}

module.exports = { startMockServer, startWebServer, program };