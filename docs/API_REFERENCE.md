# Complete API Reference

**AI Humanizer - API Documentation**

[← Back to README](../README.md) | [Part 6: API Documentation →](PART_6_API_DOCS.md)

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Projects](#projects-endpoints)
  - [Transformations](#transformations-endpoints)
  - [Analytics](#analytics-endpoints)
  - [And 50+ more endpoint categories...](#complete-endpoint-list)

---

## Base URL

### Development
```
http://localhost:3001/api/v1
```

### Production
```
https://your-domain.com/api/v1
```

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

1. **Register** or **Login** to get access and refresh tokens
2. Use the `accessToken` in the Authorization header
3. Refresh tokens when they expire using the refresh endpoint

### Token Expiration

- **Access Token**: 7 days (configurable)
- **Refresh Token**: 30 days (configurable)

---

## Rate Limiting

The API implements different rate limits based on endpoint sensitivity:

| Rate Limit Type | Requests | Window | Endpoints |
|----------------|----------|--------|-----------|
| **Relaxed** | 1000 | 15 minutes | Analytics, Templates |
| **Standard** | 100 | 15 minutes | Most endpoints |
| **Strict** | 10 | 15 minutes | Auth, MFA, Admin |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

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
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## API Endpoints

### Authentication Endpoints

#### Register User

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

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Same as Register

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

---

### Projects Endpoints

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

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My First Project",
    "description": "A test project",
    "status": "ACTIVE",
    "wordCount": 15,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
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

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

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

---

### Transformations Endpoints

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

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-id",
    "status": "PROCESSING",
    "progress": 65,
    "chunksProcessed": 13,
    "totalChunks": 20,
    "estimatedTimeRemaining": 5000
  }
}
```

#### Cancel Transformation

```http
POST /api/v1/transformations/cancel/:jobId
Authorization: Bearer <token>
```

---

### Analytics Endpoints

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

#### Get Analytics Dashboard

```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <token>
```

---

## Complete Endpoint List

The API includes **57+ endpoint categories**:

### Core Features
- `/auth` - Authentication
- `/mfa` - Multi-factor authentication
- `/projects` - Project management
- `/transformations` - Text humanization
- `/detection` - AI detection
- `/tone` - Tone adjustment
- `/analytics` - Analytics and reporting

### Content Transformation
- `/summarization` - Text summarization
- `/expansion` - Content expansion
- `/translation` - Multi-language translation
- `/simplification` - Text simplification
- `/formalization` - Formal tone conversion
- `/repurposing` - Content repurposing
- `/enrichment` - Content enrichment
- `/fact-checking` - Fact verification
- `/grammar` - Grammar correction

### Collaboration & Version Control
- `/collaboration` - Real-time collaboration
- `/versions` - Version control
- `/branches` - Branching system
- `/templates` - Template management

### Storage & Integration
- `/storage` - File storage
- `/cloud-storage` - Cloud integrations (Google Drive, Dropbox, OneDrive)
- `/search` - Advanced search

### Enterprise Features
- `/subscription` - Subscription management
- `/usage` - Usage tracking
- `/invoices` - Invoice management
- `/webhooks` - Webhook management
- `/white-label` - White-label configuration
- `/partners` - Partner integrations

### Quality & Analysis
- `/plagiarism` - Plagiarism detection
- `/citation` - Citation management
- `/seo` - SEO optimization
- `/content-analysis` - Content analysis
- `/content-moderation` - Content moderation
- `/watermark` - Watermarking

### Advanced Features
- `/ab-testing` - A/B testing
- `/scheduling` - Scheduling and automation
- `/localization` - Localization
- `/learning-profile` - Learning profiles
- `/retention` - Data retention
- `/expiration` - Content expiration
- `/anonymization` - Data anonymization

### Administration
- `/admin` - Admin panel
- `/ml-models` - ML model management
- `/training-data` - Training data
- `/training-jobs` - Training jobs
- `/feature-flags` - Feature flags
- `/performance` - Performance optimization
- `/auto-scaling` - Auto-scaling
- `/disaster-recovery` - Disaster recovery
- `/cdn` - CDN management
- `/cost-management` - Cost tracking
- `/data-pipeline` - Data pipelines
- `/legal` - Legal compliance
- `/support` - Support tools
- `/customer-success` - Customer success

---

## Interactive Documentation

For complete, interactive API documentation with:
- All endpoints with request/response examples
- Try-it-out functionality
- Schema definitions
- Authentication testing

Visit: **http://localhost:3001/api/docs**

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

const result = await client.transformations.humanize({
  text: 'AI-generated text...',
  level: 3,
  strategy: 'professional'
});
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
```

---

## Webhooks

### Webhook Events

- `project.created`
- `project.updated`
- `transformation.completed`
- `transformation.failed`
- `user.subscription.updated`

### Webhook Configuration

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

---

## Rate Limits by Tier

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|---------------|
| FREE | 10 | 100 | 1,000 |
| BASIC | 30 | 500 | 10,000 |
| PRO | 100 | 2,000 | 50,000 |
| ENTERPRISE | 500 | 10,000 | Unlimited |

---

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Store Tokens Securely**: Never expose tokens in client-side code
3. **Handle Errors**: Implement proper error handling
4. **Respect Rate Limits**: Implement exponential backoff
5. **Use Webhooks**: Prefer webhooks over polling
6. **Cache Responses**: Cache static data when possible
7. **Validate Input**: Validate all input data
8. **Monitor Usage**: Track API usage and costs

---

## Support

- **API Documentation**: http://localhost:3001/api/docs
- **GitHub Issues**: For bug reports
- **Email Support**: mubvafhimoses813@gmail.com
- **Documentation**: [Part 6: API Documentation](PART_6_API_DOCS.md)

---

[← Back to README](../README.md) | [Part 6: API Documentation →](PART_6_API_DOCS.md)

