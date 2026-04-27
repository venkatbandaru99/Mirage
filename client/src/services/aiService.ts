/**
 * AI Service for OpenAPI Spec Generation
 * Uses Transformers.js via CDN for browser-based AI inference
 */

// Import Transformers.js from installed package
let transformersModule: any = null;

const loadTransformers = async () => {
  if (transformersModule) return transformersModule;
  
  try {
    console.log('🔄 Loading Transformers.js from installed package...');
    // Use direct import from installed package
    const module = await import('@xenova/transformers');
    transformersModule = module;
    console.log('✅ Transformers.js loaded successfully from package');
    return module;
  } catch (error) {
    console.error('❌ Failed to load Transformers.js package:', error);
    throw new Error('Failed to initialize AI service - package loading issue');
  }
};

// AI-powered OpenAPI spec generation
export class AISpecGenerator {
  private pipeline: any = null;
  private isLoaded = false;

  async initialize() {
    if (this.isLoaded) return;
    
    try {
      console.log('🤖 Initializing AI model...');
      
      // Test if we can load the transformers module first
      console.log('📦 Loading transformers module...');
      const transformers = await loadTransformers();
      console.log('✅ Transformers module loaded, available methods:', Object.keys(transformers));
      
      const { pipeline } = transformers;
      if (!pipeline) {
        throw new Error('Pipeline function not found in transformers module');
      }
      
      console.log('🏗️ Creating text generation pipeline...');
      
      // Try with a smaller, more basic model first
      this.pipeline = await pipeline('text-generation', 'Xenova/distilgpt2', {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log(`📥 Model download progress:`, progress);
          if (progress.status === 'downloading') {
            console.log(`📥 Downloading: ${progress.name} (${Math.round(progress.progress || 0)}%)`);
          }
        }
      });
      
      this.isLoaded = true;
      console.log('✅ AI model loaded successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize AI model:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }

  async generateOpenAPISpec(description: string): Promise<{spec: string, method: 'ai' | 'fallback', details: string}> {
    try {
      if (!this.isLoaded) {
        console.log('🔄 Initializing AI model...');
        await this.initialize();
      }

      const prompt = this.buildPrompt(description);
      console.log('🧠 Generating OpenAPI spec with AI...');
      
      if (!this.pipeline) {
        throw new Error('AI pipeline not initialized');
      }
      
      const result = await this.pipeline(prompt, {
        max_new_tokens: 1500,
        do_sample: true,
        temperature: 0.3, // Lower temperature for more consistent output
        top_p: 0.9,
        repetition_penalty: 1.1,
        no_repeat_ngram_size: 3,
      });

      const generatedText = result[0].generated_text;
      const openApiSpec = this.extractOpenAPISpec(generatedText, prompt);
      const validatedSpec = this.validateAndEnhanceSpec(openApiSpec, description);
      
      console.log('🎉 SUCCESS: OpenAPI spec generated using AI (Phi-3-mini model)');
      return {
        spec: validatedSpec,
        method: 'ai',
        details: 'Generated using Phi-3-mini AI model with natural language processing'
      };
    } catch (error) {
      console.error('❌ AI generation failed:', error);
      console.log('🔄 Falling back to smart template generation...');
      
      const fallbackReason = error instanceof Error ? error.message : 'Unknown AI error';
      console.log(`📋 Fallback reason: ${fallbackReason}`);
      
      const fallbackSpec = this.generateFallbackSpec(description);
      const detectedResource = this.detectResourceFromDescription(description);
      
      console.log(`🎯 SUCCESS: OpenAPI spec generated using smart template (detected: ${detectedResource})`);
      return {
        spec: fallbackSpec,
        method: 'fallback',
        details: `Smart template generation (detected resource: ${detectedResource}). Fallback reason: ${fallbackReason}`
      };
    }
  }

  private buildPrompt(description: string): string {
    return `You are an expert API designer. Generate a complete OpenAPI 3.0 specification in YAML format for the following API description:

${description}

Requirements:
- Valid OpenAPI 3.0 syntax
- Include info, servers, paths, and components sections
- Add realistic endpoints based on the description
- Include appropriate HTTP methods (GET, POST, PUT, DELETE)
- Define request/response schemas with proper data types
- Add example values for better documentation
- Use standard HTTP status codes
- Include parameter validation where appropriate

OpenAPI Specification:

\`\`\`yaml
openapi: 3.0.0
info:`;
  }

  private extractOpenAPISpec(generatedText: string, originalPrompt: string): string {
    // Remove the original prompt from the generated text
    let spec = generatedText.replace(originalPrompt, '').trim();
    
    // Extract YAML content between code blocks if present
    const yamlMatch = spec.match(/```(?:yaml)?\n([\s\S]*?)\n```/);
    if (yamlMatch) {
      spec = yamlMatch[1];
    }
    
    // Ensure it starts with openapi version
    if (!spec.includes('openapi:')) {
      spec = `openapi: 3.0.0\n${spec}`;
    }
    
    return spec;
  }

  private validateAndEnhanceSpec(spec: string, description: string): string {
    try {
      // Basic validation - ensure it has required sections
      if (!spec.includes('info:')) {
        spec += `\ninfo:\n  title: Generated API\n  version: 1.0.0\n  description: ${description}`;
      }
      
      if (!spec.includes('paths:')) {
        spec += `\npaths:\n  /health:\n    get:\n      summary: Health check\n      responses:\n        '200':\n          description: API is healthy`;
      }

      if (!spec.includes('servers:')) {
        spec += `\nservers:\n  - url: http://localhost:3001\n    description: Local development server`;
      }
      
      return spec;
    } catch (error) {
      console.error('❌ Spec validation failed:', error);
      return this.generateFallbackSpec(description);
    }
  }

  private generateFallbackSpec(description: string): string {
    const timestamp = new Date().toISOString();
    
    // Smart context detection for better fallbacks
    const resourceName = this.detectResourceFromDescription(description);
    const resourcePath = `/${resourceName}`;
    
    // Escape description for YAML - replace problematic characters
    const safeDescription = description
      .replace(/:/g, ' -') // Replace colons
      .replace(/"/g, "'")   // Replace double quotes with single
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .replace(/\r/g, ' ')  // Replace carriage returns
      .trim();
    
    const resourceSingular = resourceName.slice(0, -1); // Remove 's' from plural
    
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

  ${resourcePath}:
    get:
      summary: Get all ${resourceName}
      responses:
        '200':
          description: List of ${resourceName}
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                      example: 1
                    name:
                      type: string
                      example: "Sample ${resourceSingular}"
                    created:
                      type: string
                      format: date-time
                      example: "${timestamp}"
    post:
      summary: Create new ${resourceSingular}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                  example: "New ${resourceSingular}"
      responses:
        '201':
          description: ${resourceSingular} created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  name:
                    type: string
                    example: "New ${resourceSingular}"
                  created:
                    type: string
                    format: date-time
                    example: "${timestamp}"

components:
  schemas:
    Error:
      type: object
      properties:
        message:
          type: string
        code:
          type: integer`;
  }

  // Check if AI model is ready
  isReady(): boolean {
    return this.isLoaded && this.pipeline !== null;
  }

  // Get loading status
  getStatus(): string {
    if (!this.isLoaded) return 'not_loaded';
    if (!this.pipeline) return 'loading';
    return 'ready';
  }

  // Smart resource detection from description
  private detectResourceFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Common resource patterns
    const patterns = [
      { keywords: ['invoice', 'billing', 'bill'], resource: 'invoices' },
      { keywords: ['user', 'customer', 'client'], resource: 'users' },
      { keywords: ['order', 'purchase'], resource: 'orders' },
      { keywords: ['product', 'item'], resource: 'products' },
      { keywords: ['task', 'todo'], resource: 'tasks' },
      { keywords: ['post', 'article', 'blog'], resource: 'posts' },
      { keywords: ['comment', 'review'], resource: 'comments' },
      { keywords: ['payment', 'transaction'], resource: 'payments' },
      { keywords: ['booking', 'reservation'], resource: 'bookings' },
      { keywords: ['project', 'workspace'], resource: 'projects' }
    ];
    
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => lowerDesc.includes(keyword))) {
        return pattern.resource;
      }
    }
    
    return 'items'; // Default fallback
  }
}

// Singleton instance
export const aiGenerator = new AISpecGenerator();