# Part 6: API Documentation

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: Configuration →](PART_5_CONFIGURATION.md) | [Next: Development →](PART_7_DEVELOPMENT.md)

---

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Core Endpoints](#core-endpoints)
- [Interactive Documentation](#interactive-documentation)
- [SDKs and Client Libraries](#sdks-and-client-libraries)
- [Webhooks](#webhooks)
- [Best Practices](#best-practices)

---

## API Overview

### Base URL

**Development**: `http://localhost:3001/api/v1`  
**Production**: `https://your-domain.com/api/v1`

### API Versioning

- **Current Version**: `v1`
- **Version Prefix**: `/api/v1`
- **Future Versions**: Will be released as `v2`, `v3`, etc.

### Content Type

All requests and responses use `application/json`.

### Interactive Documentation

- **Swagger UI**: http://localhost:3001/api/docs
- **OpenAPI Spec**: http://localhost:3001/api/docs/json

---

## Authentication

### JWT Token Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer <your-access-token>
```

### Getting an Access Token

#### 1. Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "tier": "FREE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 604800
    }
  }
}
```

#### 2. Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Same format as register

#### 3. Using the Token

Include the token in subsequent requests:

```http
GET /api/v1/projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Expiration

- **Access Token**: 7 days (configurable)
- **Refresh Token**: 30 days (configurable)

### Refreshing Tokens

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Rate Limiting

### Rate Limit Types

| Type | Requests | Window | Endpoints |
|------|----------|--------|-----------|
| **Relaxed** | 1000 | 15 minutes | Analytics, Templates |
| **Standard** | 100 | 15 minutes | Most endpoints |
| **Strict** | 10 | 15 minutes | Auth, MFA, Admin |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded

When rate limit is exceeded:

```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300,
  "statusCode": 429
}
```

### Handling Rate Limits

1. **Check Headers**: Monitor `X-RateLimit-Remaining`
2. **Exponential Backoff**: Implement exponential backoff
3. **Caching**: Cache responses when possible
4. **Batch Requests**: Combine multiple requests when possible

---

## Error Handling

### Error Response Format

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  },
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Errors

#### Validation Error

```json
{
  "error": "ValidationError",
  "message": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  },
  "statusCode": 400
}
```

#### Authentication Error

```json
{
  "error": "AuthenticationError",
  "message": "Invalid credentials",
  "statusCode": 401
}
```

#### Not Found Error

```json
{
  "error": "NotFoundError",
  "message": "Resource not found",
  "statusCode": 404
}
```

---

## Core Endpoints

### Projects

#### Create Project

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My First Project",
  "description": "A test project",
  "content": "Initial content here..."
}
```

#### Get Projects

```http
GET /api/v1/projects?page=1&limit=20&status=ACTIVE
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (ACTIVE, ARCHIVED)
- `search` (string): Search by name or description
- `sortBy` (string): Sort field (createdAt, updatedAt, name)
- `sortOrder` (string): Sort order (asc, desc)

#### Get Project by ID

```http
GET /api/v1/projects/:id
Authorization: Bearer <token>
```

#### Update Project

```http
PATCH /api/v1/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "content": "Updated content..."
}
```

#### Delete Project

```http
DELETE /api/v1/projects/:id
Authorization: Bearer <token>
```

### Transformations

#### Humanize Text

```http
POST /api/v1/transformations/humanize
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "AI-generated text to humanize...",
  "level": 3,
  "strategy": "professional",
  "protectedSegments": []
}
```

**Request Body:**
- `text` (string, required): Text to humanize
- `level` (number, 1-5): Humanization intensity
- `strategy` (string): Transformation strategy (casual, professional, academic, auto)
- `protectedSegments` (array): Text segments to preserve

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transformation-uuid",
    "humanizedText": "Humanized text output...",
    "metrics": {
      "detectionScore": 15,
      "perplexity": 45.2,
      "burstiness": 0.78,
      "modificationPercentage": 12.5,
      "sentencesModified": 3,
      "totalSentences": 5
    },
    "processingTime": 3500,
    "strategyUsed": "professional",
    "levelApplied": 3
  }
}
```

#### Get Transformation Status

```http
GET /api/v1/transformations/status/:jobId
Authorization: Bearer <token>
```

#### Cancel Transformation

```http
POST /api/v1/transformations/cancel/:jobId
Authorization: Bearer <token>
```

### Usage

#### Get Usage Statistics

```http
GET /api/v1/usage
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "words": {
      "used": 8500,
      "limit": 10000,
      "remaining": 1500,
      "percentUsed": 85,
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-02-01T00:00:00Z"
    },
    "apiCalls": {
      "used": 85,
      "limit": 100,
      "remaining": 15
    },
    "storage": {
      "used": 52428800,
      "limit": 104857600,
      "remaining": 52428800
    },
    "tier": "FREE"
  }
}
```

---

## Interactive Documentation

### Swagger UI

Access interactive API documentation at:

- **Development**: http://localhost:3001/api/docs
- **Production**: https://your-domain.com/api/docs

### Features

- **Try It Out**: Test endpoints directly from the browser
- **Request/Response Examples**: See example requests and responses
- **Schema Definitions**: View data models
- **Authentication Testing**: Test authentication flows

### OpenAPI Specification

Download the OpenAPI spec:

- **JSON**: http://localhost:3001/api/docs/json
- **YAML**: http://localhost:3001/api/docs/yaml

---

## SDKs and Client Libraries

### JavaScript/TypeScript

```bash
npm install @ai-humanizer/sdk
```

```typescript
import { AIHumanizer } from '@ai-humanizer/sdk';

const client = new AIHumanizer({
  apiKey: 'your-api-key',
  baseURL: 'https://api.ai-humanizer.com'
});

// Humanize text
const result = await client.transformations.humanize({
  text: 'AI-generated text...',
  level: 3,
  strategy: 'professional'
});

console.log(result.humanizedText);
```

### Python

```bash
pip install ai-humanizer
```

```python
from ai_humanizer import AIHumanizer

client = AIHumanizer(api_key='your-api-key')

result = client.transformations.humanize(
    text='AI-generated text...',
    level=3,
    strategy='professional'
)

print(result.humanized_text)
```

### cURL Examples

```bash
# Humanize text
curl -X POST https://api.ai-humanizer.com/api/v1/transformations/humanize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "AI-generated text...",
    "level": 3,
    "strategy": "professional"
  }'
```

---

## Webhooks

### Webhook Events

- `project.created`
- `project.updated`
- `project.deleted`
- `transformation.completed`
- `transformation.failed`
- `user.subscription.updated`
- `user.subscription.cancelled`

### Creating a Webhook

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["transformation.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "transformation.completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "id": "transformation-uuid",
    "projectId": "project-uuid",
    "status": "COMPLETED",
    "metrics": {
      "detectionScore": 15
    }
  }
}
```

### Webhook Security

Webhooks include an HMAC signature in the `X-Webhook-Signature` header:

```http
X-Webhook-Signature: sha256=...
```

Verify the signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(hash)
  );
}
```

---

## Best Practices

### 1. Use HTTPS

Always use HTTPS in production to protect data in transit.

### 2. Store Tokens Securely

Never expose tokens in client-side code. Store them securely:
- **Browser**: Use httpOnly cookies
- **Mobile**: Use secure storage
- **Server**: Use environment variables

### 3. Handle Errors Gracefully

Implement proper error handling:

```typescript
try {
  const result = await client.transformations.humanize({...});
} catch (error) {
  if (error.statusCode === 429) {
    // Handle rate limit
    await wait(error.retryAfter);
  } else if (error.statusCode === 401) {
    // Refresh token
    await refreshToken();
  } else {
    // Handle other errors
    console.error(error);
  }
}
```

### 4. Respect Rate Limits

- Monitor rate limit headers
- Implement exponential backoff
- Cache responses when possible
- Batch requests when appropriate

### 5. Use Webhooks

Prefer webhooks over polling for real-time updates:

```javascript
// Instead of polling
setInterval(async () => {
  const status = await getTransformationStatus(id);
  if (status === 'completed') {
    // Handle completion
  }
}, 5000);

// Use webhooks
app.post('/webhook', (req, res) => {
  if (req.body.event === 'transformation.completed') {
    // Handle completion immediately
  }
});
```

### 6. Validate Input

Always validate input before sending:

```typescript
if (!text || text.length === 0) {
  throw new Error('Text is required');
}

if (level < 1 || level > 5) {
  throw new Error('Level must be between 1 and 5');
}
```

### 7. Monitor Usage

Track API usage to stay within limits:

```typescript
const usage = await client.usage.get();
if (usage.words.percentUsed > 80) {
  console.warn('Approaching word limit');
}
```

---

## Complete API Reference

For the complete API reference with all endpoints, see:

- **[API Reference](API_REFERENCE.md)** - Detailed endpoint documentation
- **[Swagger UI](http://localhost:3001/api/docs)** - Interactive documentation

---

[← Back to README](../README.md) | [Previous: Configuration →](PART_5_CONFIGURATION.md) | [Next: Development →](PART_7_DEVELOPMENT.md)

