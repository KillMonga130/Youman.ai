/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation
 * 
 * Requirements: 23 - Comprehensive API documentation and SDKs
 * Requirements: 59 - User onboarding and tutorials
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AI Humanizer API',
    version: '1.0.0',
    description: `
# AI Humanizer API Documentation

The AI Humanizer API enables you to transform AI-generated text into natural, human-like content 
that maintains authenticity while avoiding detection by AI content detectors.

## Features

- **Text Transformation**: Convert AI-generated text to human-like content
- **Multiple Strategies**: Choose from casual, professional, or academic writing styles
- **Customizable Levels**: Control transformation intensity from 1 (minimal) to 5 (maximum)
- **Protected Segments**: Preserve specific phrases or terminology
- **Multi-language Support**: Process content in English, Spanish, French, German, and Portuguese
- **Batch Processing**: Process up to 50 documents simultaneously
- **Real-time Detection Testing**: Verify content against multiple AI detectors
- **Version Control**: Track changes with full revision history
- **Collaboration**: Share projects with team members

## Authentication

All API endpoints (except health checks) require authentication using JWT tokens.

### Getting Started

1. Register an account: \`POST /api/v1/auth/register\`
2. Login to get tokens: \`POST /api/v1/auth/login\`
3. Include the access token in the Authorization header: \`Authorization: Bearer <token>\`

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get new access tokens:
\`POST /api/v1/auth/refresh\`

## Rate Limiting

API requests are rate-limited based on your subscription tier:

| Tier | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 10 | 100 |
| Basic | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | 1,000 | Unlimited |

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
\`\`\`

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
    `,
    contact: {
      name: 'AI Humanizer Support',
      email: 'support@aihumanizer.com',
      url: 'https://aihumanizer.com/support',
    },
    license: {
      name: 'Proprietary',
      url: 'https://aihumanizer.com/terms',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.aihumanizer.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and session management' },
    { name: 'MFA', description: 'Multi-factor authentication' },
    { name: 'Projects', description: 'Project management operations' },
    { name: 'Transformations', description: 'Text humanization operations' },
    { name: 'Versions', description: 'Version control and history' },
    { name: 'Branches', description: 'Branch management for projects' },
    { name: 'Storage', description: 'Document storage operations' },
    { name: 'Collaboration', description: 'Team collaboration features' },
    { name: 'Subscription', description: 'Subscription and billing management' },
    { name: 'Usage', description: 'Usage tracking and quotas' },
    { name: 'SEO', description: 'SEO keyword preservation' },
    { name: 'Plagiarism', description: 'Plagiarism detection' },
    { name: 'Citation', description: 'Citation management' },
    { name: 'A/B Testing', description: 'Content variation testing' },
    { name: 'Scheduling', description: 'Scheduled processing' },
    { name: 'Cloud Storage', description: 'Cloud storage integrations' },
    { name: 'Webhooks', description: 'Webhook management' },
    { name: 'Search', description: 'Search and filtering' },
    { name: 'Admin', description: 'Administrative operations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /auth/login',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access',
      },
    },
    schemas: {
      // Authentication schemas
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
          name: { type: 'string', minLength: 2, example: 'John Doe' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'SecurePass123!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Login successful' },
          tokens: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'number', example: 900 },
            },
          },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Project schemas
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'My Blog Post' },
          description: { type: 'string', example: 'A blog post about AI' },
          status: { type: 'string', enum: ['draft', 'processing', 'completed', 'archived'] },
          wordCount: { type: 'number', example: 1500 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255, example: 'My Blog Post' },
          description: { type: 'string', maxLength: 1000, example: 'A blog post about AI' },
          content: { type: 'string', example: 'The original AI-generated content...' },
          settings: {
            type: 'object',
            properties: {
              level: { type: 'number', minimum: 1, maximum: 5, default: 3 },
              strategy: { type: 'string', enum: ['casual', 'professional', 'academic', 'auto'] },
            },
          },
        },
      },
      // Transformation schemas
      TransformRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1, maxLength: 2000000, description: 'Text to humanize (up to 500,000 words)' },
          level: { type: 'number', minimum: 1, maximum: 5, default: 3, description: 'Humanization intensity (1=minimal, 5=maximum)' },
          strategy: { type: 'string', enum: ['casual', 'professional', 'academic', 'auto'], default: 'auto' },
          protectedDelimiters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                open: { type: 'string', example: '[[' },
                close: { type: 'string', example: ']]' },
              },
            },
          },
          language: { type: 'string', example: 'en', description: 'ISO 639-1 language code (auto-detected if not provided)' },
          customSettings: {
            type: 'object',
            properties: {
              preserveFormatting: { type: 'boolean', default: true },
              seoKeywords: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      TransformResult: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          humanizedText: { type: 'string' },
          metrics: {
            type: 'object',
            properties: {
              before: { $ref: '#/components/schemas/TextMetrics' },
              after: { $ref: '#/components/schemas/TextMetrics' },
              modificationPercentage: { type: 'number', example: 45.5 },
              sentencesModified: { type: 'number', example: 23 },
              totalSentences: { type: 'number', example: 50 },
            },
          },
          detectionScores: {
            type: 'object',
            properties: {
              gptZero: { type: 'number', example: 12.5 },
              originality: { type: 'number', example: 8.3 },
              turnitin: { type: 'number', example: 15.2 },
              average: { type: 'number', example: 12.0 },
            },
          },
          processingTime: { type: 'number', description: 'Processing time in milliseconds' },
          strategyUsed: { type: 'string' },
          levelApplied: { type: 'number' },
        },
      },
      TextMetrics: {
        type: 'object',
        properties: {
          wordCount: { type: 'number', example: 1500 },
          sentenceCount: { type: 'number', example: 75 },
          averageSentenceLength: { type: 'number', example: 20 },
          perplexity: { type: 'number', example: 85.5 },
          burstiness: { type: 'number', example: 0.72 },
          lexicalDiversity: { type: 'number', example: 0.65 },
        },
      },
      // Error schemas
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Human-readable error message' },
          code: { type: 'string', description: 'Machine-readable error code' },
          details: { type: 'object', description: 'Additional error details' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      // Pagination
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              total: { type: 'number', example: 100 },
              totalPages: { type: 'number', example: 5 },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Authentication required', code: 'UNAUTHORIZED' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Access denied', code: 'FORBIDDEN' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Resource not found', code: 'NOT_FOUND' },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
          },
        },
        headers: {
          'Retry-After': {
            description: 'Seconds until rate limit resets',
            schema: { type: 'integer' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

// Swagger paths for API endpoints
const paths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      description: 'Create a new user account with email and password',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Registration successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        409: {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Login user',
      description: 'Authenticate with email and password to receive JWT tokens',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        401: {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Logout current session',
      description: 'Invalidate the current session token',
      responses: {
        200: { description: 'Logout successful' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Get a new access token using a refresh token',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Token refreshed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/v1/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Get the currently authenticated user profile',
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/projects': {
    get: {
      tags: ['Projects'],
      summary: 'List projects',
      description: 'Get a paginated list of projects for the authenticated user',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'processing', 'completed', 'archived'] } },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or description' },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'name'] } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
      ],
      responses: {
        200: {
          description: 'List of projects',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/PaginatedResponse' },
                  {
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Project' },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Create project',
      description: 'Create a new project',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateProjectRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Project created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  project: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/v1/projects/{id}': {
    get: {
      tags: ['Projects'],
      summary: 'Get project',
      description: 'Get a specific project by ID',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Project details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  project: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Projects'],
      summary: 'Update project',
      description: 'Update a project',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['draft', 'processing', 'completed', 'archived'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Project updated' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Delete project',
      description: 'Delete a project (soft delete)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Project deleted' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/v1/transformations': {
    post: {
      tags: ['Transformations'],
      summary: 'Transform text',
      description: 'Humanize AI-generated text with customizable settings',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TransformRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Transformation result',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransformResult' },
            },
          },
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        429: { $ref: '#/components/responses/RateLimited' },
      },
    },
  },
  '/api/v1/transformations/{id}': {
    get: {
      tags: ['Transformations'],
      summary: 'Get transformation status',
      description: 'Get the status and progress of a transformation job',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Transformation status',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
                  progress: { type: 'number', minimum: 0, maximum: 100 },
                  result: { $ref: '#/components/schemas/TransformResult' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Check the health status of the API and its dependencies',
      security: [],
      responses: {
        200: {
          description: 'System healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'healthy' },
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', example: '1.0.0' },
                  databases: {
                    type: 'object',
                    properties: {
                      postgres: { type: 'string', example: 'connected' },
                      mongodb: { type: 'string', example: 'connected' },
                      redis: { type: 'string', example: 'connected' },
                    },
                  },
                },
              },
            },
          },
        },
        503: { description: 'System unhealthy' },
      },
    },
  },
};

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    ...swaggerDefinition,
    paths,
  },
  apis: [], // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 */
export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use(
    '/api/v1/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AI Humanizer API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    })
  );

  // Serve raw OpenAPI spec
  app.get('/api/v1/docs/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.get('/api/v1/docs/openapi.yaml', (_req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(jsonToYaml(swaggerSpec));
  });
}

/**
 * Simple JSON to YAML converter for OpenAPI spec
 */
function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
      return `|\n${obj.split('\n').map(line => spaces + '  ' + line).join('\n')}`;
    }
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  
  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        const valueStr = jsonToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      })
      .join('\n');
  }
  
  return String(obj);
}

export { swaggerSpec };
