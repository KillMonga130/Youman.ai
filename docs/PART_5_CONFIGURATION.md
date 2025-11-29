# Part 5: Configuration

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: Installation →](PART_4_INSTALLATION.md) | [Next: API Documentation →](PART_6_API_DOCS.md)

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [AI Service Configuration](#ai-service-configuration)
- [Security Configuration](#security-configuration)
- [Feature Flags](#feature-flags)
- [Cloud Storage Configuration](#cloud-storage-configuration)
- [Email Configuration](#email-configuration)
- [Payment Configuration](#payment-configuration)
- [Monitoring Configuration](#monitoring-configuration)

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in `packages/backend/`:

```env
# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=3001
API_VERSION=v1
HOST=0.0.0.0

# ============================================
# Database - PostgreSQL
# ============================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_humanizer
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================
# Database - MongoDB
# ============================================
MONGODB_URI=mongodb://localhost:27017/ai_humanizer
MONGODB_POOL_SIZE=10

# ============================================
# Database - Redis
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# ============================================
# Authentication
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=30d
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true

# ============================================
# CORS Configuration
# ============================================
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# ============================================
# AI Services - OpenAI
# ============================================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=
OPENAI_DEFAULT_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# ============================================
# AI Services - Anthropic
# ============================================
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
ANTHROPIC_DEFAULT_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4000

# ============================================
# AI Services - AWS Bedrock
# ============================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-v2
AWS_BEDROCK_ENDPOINT_URL=

# ============================================
# AI Services - Google Gemini
# ============================================
GOOGLE_API_KEY=your-google-api-key
GOOGLE_DEFAULT_MODEL=gemini-2.0-flash-exp

# ============================================
# Cloud Storage - AWS S3
# ============================================
AWS_S3_BUCKET=ai-humanizer-storage
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-s3-access-key
AWS_S3_SECRET_ACCESS_KEY=your-s3-secret-key
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false

# ============================================
# Cloud Storage - Google Drive
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/cloud-storage/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/drive.readonly

# ============================================
# Cloud Storage - Dropbox
# ============================================
DROPBOX_APP_KEY=your-dropbox-app-key
DROPBOX_APP_SECRET=your-dropbox-app-secret
DROPBOX_REDIRECT_URI=http://localhost:3001/api/v1/cloud-storage/dropbox/callback

# ============================================
# Email (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@ai-humanizer.com
SMTP_FROM_NAME=AI Humanizer

# ============================================
# Stripe (Payments)
# ============================================
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_API_VERSION=2023-10-16

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_MAX_REQUESTS=10
RATE_LIMIT_RELAXED_MAX_REQUESTS=1000

# ============================================
# Feature Flags
# ============================================
ENABLE_AI_DETECTION=true
ENABLE_COLLABORATION=true
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=true
ENABLE_WHITE_LABEL=false
ENABLE_MFA=true
ENABLE_PLAGIARISM_CHECK=true

# ============================================
# Monitoring
# ============================================
ENABLE_METRICS=true
METRICS_PORT=9090
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/app.log

# ============================================
# Security
# ============================================
SESSION_SECRET=your-session-secret
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
TRUST_PROXY=false
HELMET_ENABLED=true

# ============================================
# File Upload
# ============================================
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,docx,txt,epub
UPLOAD_DIR=uploads

# ============================================
# Webhooks
# ============================================
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT=5000
WEBHOOK_RETRY_ATTEMPTS=3
```

### Frontend Environment Variables

Create a `.env` file in `packages/frontend/`:

```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_COLLABORATION=true

# App Configuration
VITE_APP_NAME=AI Humanizer
VITE_APP_VERSION=1.0.0

# Stripe (Public Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
```

---

## Database Configuration

### PostgreSQL Configuration

#### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?[parameters]
```

#### Example

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_humanizer?schema=public
```

#### Connection Pool Settings

```env
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
```

### MongoDB Configuration

#### Connection String Format

```
mongodb://[user]:[password]@[host]:[port]/[database]?[parameters]
```

#### Example

```env
MONGODB_URI=mongodb://localhost:27017/ai_humanizer
```

#### Connection Options

```env
MONGODB_POOL_SIZE=10
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=30000
```

### Redis Configuration

#### Connection String Format

```
redis://[password]@[host]:[port]/[database]
```

#### Example

```env
REDIS_URL=redis://localhost:6379/0
```

#### Redis Options

```env
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=ai_humanizer:
REDIS_TTL=3600
```

---

## AI Service Configuration

### OpenAI Configuration

#### Getting API Key

1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### Configuration

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=org-your-org-id
OPENAI_DEFAULT_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7
```

#### Supported Models

- `gpt-4-turbo-preview` - Latest GPT-4 Turbo
- `gpt-4` - Standard GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo

### Anthropic Configuration

#### Getting API Key

1. Visit https://console.anthropic.com/
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

#### Configuration

```env
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
ANTHROPIC_DEFAULT_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4000
```

#### Supported Models

- `claude-3-opus-20240229` - Highest quality
- `claude-3-sonnet-20240229` - Best value
- `claude-3-haiku-20240307` - Fast and cheap

### AWS Bedrock Configuration

#### Prerequisites

1. AWS Account
2. IAM user with Bedrock permissions
3. Bedrock access enabled in your region

#### Configuration

```env
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-v2
```

#### IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Testing Connection

```bash
cd packages/backend
npm run test:bedrock
```

### Google Gemini Configuration

#### Getting API Key

1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key

#### Configuration

```env
GOOGLE_API_KEY=your-google-api-key
GOOGLE_DEFAULT_MODEL=gemini-2.0-flash-exp
```

#### Supported Models

- `gemini-2.0-flash-exp` - Fast and cost-effective
- `gemini-1.5-pro` - Large context window

---

## Security Configuration

### JWT Configuration

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=30d
```

**⚠️ Important**: Use strong, random secrets in production:

```bash
# Generate secure secrets
openssl rand -base64 32
```

### Password Policy

```env
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
```

### CORS Configuration

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

### Security Headers

```env
HELMET_ENABLED=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
TRUST_PROXY=true
```

---

## Feature Flags

### Available Feature Flags

```env
# Core Features
ENABLE_AI_DETECTION=true
ENABLE_COLLABORATION=true
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=true
ENABLE_WHITE_LABEL=false

# Security Features
ENABLE_MFA=true
ENABLE_RATE_LIMITING=true

# Content Features
ENABLE_PLAGIARISM_CHECK=true
ENABLE_SEO_OPTIMIZATION=true
ENABLE_TRANSLATION=true

# Enterprise Features
ENABLE_WHITE_LABEL=false
ENABLE_PARTNER_INTEGRATIONS=false
```

### Using Feature Flags

Feature flags can be toggled via environment variables or the admin panel.

---

## Cloud Storage Configuration

### AWS S3 Configuration

```env
AWS_S3_BUCKET=ai-humanizer-storage
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-s3-access-key
AWS_S3_SECRET_ACCESS_KEY=your-s3-secret-key
```

#### S3 Bucket Setup

1. Create S3 bucket
2. Configure CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

3. Set bucket policy for public read (if needed)

### Google Drive Configuration

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/cloud-storage/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/drive.readonly
```

#### Google Cloud Setup

1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add redirect URI
4. Copy client ID and secret

### Dropbox Configuration

```env
DROPBOX_APP_KEY=your-dropbox-app-key
DROPBOX_APP_SECRET=your-dropbox-app-secret
DROPBOX_REDIRECT_URI=http://localhost:3001/api/v1/cloud-storage/dropbox/callback
```

#### Dropbox App Setup

1. Go to Dropbox App Console
2. Create new app
3. Set redirect URI
4. Copy app key and secret

---

## Email Configuration

### SMTP Configuration

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@ai-humanizer.com
SMTP_FROM_NAME=AI Humanizer
```

### Gmail Setup

1. Enable 2-factor authentication
2. Generate app password
3. Use app password in `SMTP_PASS`

### Other SMTP Providers

#### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

---

## Payment Configuration

### Stripe Configuration

```env
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_API_VERSION=2023-10-16
```

#### Stripe Setup

1. Create Stripe account
2. Get API keys from dashboard
3. Set up webhook endpoint
4. Copy webhook secret

#### Webhook Configuration

- **Endpoint**: `https://your-domain.com/api/v1/webhooks/stripe`
- **Events**: `customer.subscription.*`, `invoice.*`, `payment_intent.*`

---

## Monitoring Configuration

### Prometheus Configuration

```env
ENABLE_METRICS=true
METRICS_PORT=9090
PROMETHEUS_ENABLED=true
```

### Logging Configuration

```env
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/app.log
```

#### Log Levels

- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - All logs including debug

---

## Production Configuration Checklist

- [ ] Use strong, random secrets for JWT
- [ ] Enable HTTPS (COOKIE_SECURE=true)
- [ ] Set TRUST_PROXY=true behind reverse proxy
- [ ] Configure production database URLs
- [ ] Set up proper CORS origins
- [ ] Enable rate limiting
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Configure error tracking
- [ ] Review security headers

---

[← Back to README](../README.md) | [Previous: Installation →](PART_4_INSTALLATION.md) | [Next: API Documentation →](PART_6_API_DOCS.md)

