# AI Humanizer Developer Guide

This guide provides comprehensive documentation for developers integrating with the AI Humanizer API.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Reference](#api-reference)
4. [SDKs](#sdks)
5. [Webhooks](#webhooks)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Quick Start

### Base URL

```
Production: https://api.aihumanizer.com/api/v1
Development: http://localhost:3000/api/v1
```

### Interactive Documentation

Access the Swagger UI at `/api/v1/docs` for interactive API exploration.

### First API Call

```bash
# 1. Register an account
curl -X POST https://api.aihumanizer.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!",
    "name": "Developer"
  }'

# 2. Login to get tokens
curl -X POST https://api.aihumanizer.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!"
  }'

# 3. Use the access token for API calls
curl -X POST https://api.aihumanizer.com/api/v1/transformations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "text": "Your AI-generated text here...",
    "level": 3,
    "strategy": "auto"
  }'
```

---

## Authentication

### JWT Authentication

The API uses JWT (JSON Web Tokens) for authentication.

#### Token Types

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 15 minutes | API requests |
| Refresh Token | 7 days | Get new access tokens |

#### Getting Tokens

```javascript
// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { tokens } = await response.json();
// tokens.accessToken - Use for API calls
// tokens.refreshToken - Store securely for token refresh
```

#### Using Tokens

Include the access token in the Authorization header:

```javascript
const response = await fetch('/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Refreshing Tokens

```javascript
const response = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: storedRefreshToken
  })
});

const { tokens } = await response.json();
// Update stored tokens
```

### API Key Authentication

For server-to-server integrations, use API keys:

```javascript
const response = await fetch('/api/v1/transformations', {
  headers: {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify({ text: '...' })
});
```

Generate API keys in your account settings.

---

## API Reference

### Transformations

#### Transform Text

```http
POST /api/v1/transformations
```

Request body:

```json
{
  "text": "The AI-generated text to humanize...",
  "level": 3,
  "strategy": "auto",
  "protectedDelimiters": [
    { "open": "[[", "close": "]]" }
  ],
  "language": "en",
  "customSettings": {
    "preserveFormatting": true,
    "seoKeywords": ["keyword1", "keyword2"]
  }
}
```

Response:

```json
{
  "id": "uuid",
  "humanizedText": "The transformed human-like text...",
  "metrics": {
    "before": {
      "wordCount": 500,
      "perplexity": 45.2,
      "burstiness": 0.42
    },
    "after": {
      "wordCount": 512,
      "perplexity": 87.5,
      "burstiness": 0.78
    },
    "modificationPercentage": 42.5
  },
  "detectionScores": {
    "gptZero": 12.5,
    "originality": 8.3,
    "average": 10.4
  },
  "processingTime": 2340,
  "strategyUsed": "professional",
  "levelApplied": 3
}
```

#### Get Transformation Status

For long-running transformations:

```http
GET /api/v1/transformations/{id}
```

Response:

```json
{
  "id": "uuid",
  "status": "processing",
  "progress": 45,
  "currentChunk": 5,
  "totalChunks": 11,
  "estimatedTimeRemaining": 30000
}
```

### Projects

#### Create Project

```http
POST /api/v1/projects
```

```json
{
  "name": "My Blog Post",
  "description": "A blog post about AI",
  "content": "Original content...",
  "settings": {
    "level": 3,
    "strategy": "casual"
  }
}
```

#### List Projects

```http
GET /api/v1/projects?page=1&limit=20&status=completed
```

#### Get Project

```http
GET /api/v1/projects/{id}
```

#### Update Project

```http
PATCH /api/v1/projects/{id}
```

#### Delete Project

```http
DELETE /api/v1/projects/{id}
```

### Versions

#### Create Version

```http
POST /api/v1/versions
```

```json
{
  "projectId": "uuid",
  "name": "First draft",
  "content": "Content at this version..."
}
```

#### List Versions

```http
GET /api/v1/versions?projectId={projectId}
```

#### Compare Versions

```http
GET /api/v1/versions/compare?version1={id1}&version2={id2}
```

### Detection

#### Test Detection

```http
POST /api/v1/detection/test
```

```json
{
  "text": "Text to test for AI detection..."
}
```

Response:

```json
{
  "scores": {
    "gptZero": 15.2,
    "originality": 12.8,
    "turnitin": 18.5,
    "internal": 14.1,
    "average": 15.15
  },
  "verdict": "likely_human",
  "confidence": 0.85
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @ai-humanizer/sdk
```

```typescript
import { AIHumanizer } from '@ai-humanizer/sdk';

const client = new AIHumanizer({
  apiKey: 'your-api-key'
});

// Transform text
const result = await client.transform({
  text: 'Your AI-generated text...',
  level: 3,
  strategy: 'auto'
});

console.log(result.humanizedText);
console.log(result.detectionScores);
```

### Python

```bash
pip install ai-humanizer
```

```python
from ai_humanizer import AIHumanizer

client = AIHumanizer(api_key='your-api-key')

result = client.transform(
    text='Your AI-generated text...',
    level=3,
    strategy='auto'
)

print(result.humanized_text)
print(result.detection_scores)
```

### Java

```xml
<dependency>
  <groupId>com.aihumanizer</groupId>
  <artifactId>ai-humanizer-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

```java
import com.aihumanizer.AIHumanizer;
import com.aihumanizer.TransformResult;

AIHumanizer client = new AIHumanizer("your-api-key");

TransformResult result = client.transform()
    .text("Your AI-generated text...")
    .level(3)
    .strategy("auto")
    .execute();

System.out.println(result.getHumanizedText());
```

### C#

```bash
dotnet add package AIHumanizer
```

```csharp
using AIHumanizer;

var client = new AIHumanizerClient("your-api-key");

var result = await client.TransformAsync(new TransformRequest
{
    Text = "Your AI-generated text...",
    Level = 3,
    Strategy = "auto"
});

Console.WriteLine(result.HumanizedText);
```

---

## Webhooks

### Registering Webhooks

```http
POST /api/v1/webhooks
```

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["transformation.completed", "transformation.failed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `transformation.completed` | Transformation finished successfully |
| `transformation.failed` | Transformation failed |
| `project.created` | New project created |
| `project.deleted` | Project deleted |
| `quota.warning` | Approaching usage quota |
| `quota.exceeded` | Usage quota exceeded |

### Webhook Payload

```json
{
  "event": "transformation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "transformationId": "uuid",
    "projectId": "uuid",
    "status": "completed",
    "metrics": { ... }
  }
}
```

### Verifying Webhooks

Verify the HMAC signature in the `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Rate Limiting

### Limits by Tier

| Tier | Requests/min | Requests/day | Concurrent |
|------|--------------|--------------|------------|
| Free | 10 | 100 | 1 |
| Basic | 60 | 1,000 | 5 |
| Pro | 300 | 10,000 | 20 |
| Enterprise | 1,000 | Unlimited | 100 |

### Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

### Handling Rate Limits

```javascript
async function makeRequest(url, options, retries = 3) {
  const response = await fetch(url, options);
  
  if (response.status === 429 && retries > 0) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return makeRequest(url, options, retries - 1);
  }
  
  return response;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": ["Specific field error"]
  },
  "requestId": "uuid"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | Usage quota exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Handling Example

```javascript
try {
  const result = await client.transform({ text: '...' });
} catch (error) {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      console.error('Invalid input:', error.details);
      break;
    case 'RATE_LIMITED':
      await delay(error.retryAfter * 1000);
      // Retry request
      break;
    case 'QUOTA_EXCEEDED':
      console.error('Upgrade your plan');
      break;
    default:
      console.error('Unexpected error:', error.message);
  }
}
```

---

## Best Practices

### 1. Handle Large Documents

For documents over 10,000 words, use async processing:

```javascript
// Start transformation
const { id } = await client.transform({
  text: largeDocument,
  async: true
});

// Poll for completion
let status;
do {
  await delay(2000);
  status = await client.getTransformationStatus(id);
} while (status.status === 'processing');

const result = status.result;
```

### 2. Use Webhooks for Long Operations

Instead of polling, register webhooks:

```javascript
await client.registerWebhook({
  url: 'https://your-server.com/webhook',
  events: ['transformation.completed']
});
```

### 3. Implement Retry Logic

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 'RATE_LIMITED') {
        await delay(error.retryAfter * 1000);
      } else {
        await delay(Math.pow(2, i) * 1000);
      }
    }
  }
}
```

### 4. Cache Results

Cache transformation results to avoid redundant API calls:

```javascript
const cache = new Map();

async function transform(text, options) {
  const cacheKey = hash(text + JSON.stringify(options));
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await client.transform({ text, ...options });
  cache.set(cacheKey, result);
  return result;
}
```

### 5. Batch Processing

Process multiple documents efficiently:

```javascript
const documents = ['doc1', 'doc2', 'doc3'];

// Process in parallel with concurrency limit
const results = await Promise.all(
  documents.map((doc, i) => 
    delay(i * 100).then(() => client.transform({ text: doc }))
  )
);
```

---

## Examples

### Complete Integration Example

```javascript
import { AIHumanizer } from '@ai-humanizer/sdk';

class ContentProcessor {
  constructor(apiKey) {
    this.client = new AIHumanizer({ apiKey });
  }

  async processContent(content, options = {}) {
    const {
      level = 3,
      strategy = 'auto',
      protectedTerms = []
    } = options;

    // Wrap protected terms
    let processedContent = content;
    for (const term of protectedTerms) {
      processedContent = processedContent.replace(
        new RegExp(term, 'g'),
        `[[${term}]]`
      );
    }

    // Transform
    const result = await this.client.transform({
      text: processedContent,
      level,
      strategy,
      protectedDelimiters: [{ open: '[[', close: ']]' }]
    });

    // Check detection scores
    if (result.detectionScores.average > 20) {
      console.warn('High detection score, consider re-processing');
    }

    return {
      text: result.humanizedText,
      metrics: result.metrics,
      scores: result.detectionScores
    };
  }
}

// Usage
const processor = new ContentProcessor('your-api-key');
const result = await processor.processContent(
  'Your AI-generated content here...',
  {
    level: 3,
    strategy: 'professional',
    protectedTerms: ['AI Humanizer', 'GPT-4']
  }
);
```

---

## Support

- **API Status**: status.aihumanizer.com
- **Developer Forum**: developers.aihumanizer.com
- **Email**: api-support@aihumanizer.com
- **GitHub Issues**: github.com/aihumanizer/sdk/issues
