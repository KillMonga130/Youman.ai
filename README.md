# AI Humanizer

<div align="center">

![AI Humanizer Logo](https://img.shields.io/badge/AI-Humanizer-blue?style=for-the-badge&logo=openai)

**Transform AI-generated text into natural, human-like content**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-1675%20Passing-brightgreen)](packages/backend)

**© 2024 Mubvafhi Mueletshedzi Moses | Software ID: AIH-2024-MMM-001**

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

AI Humanizer is an enterprise-grade platform that transforms AI-generated text into natural, human-like content while preserving meaning and context. Built with modern technologies and designed for scalability, it offers comprehensive text transformation capabilities with real-time collaboration features.

### Key Capabilities

- **AI Detection & Bypass**: Detect AI-generated content and transform it to pass AI detection tools
- **Multi-Language Support**: Process text in 50+ languages with automatic detection
- **Real-Time Collaboration**: WebSocket-powered collaborative editing with operational transforms
- **Enterprise Security**: MFA, role-based access control, and comprehensive audit logging
- **Cloud Integrations**: Connect with Google Drive, Dropbox, OneDrive, and AWS S3
- **Advanced Analytics**: Track usage, performance metrics, and content quality scores

---

## ✨ Features

### Core Text Processing
| Feature | Description |
|---------|-------------|
| **AI Detection** | Multi-model detection with confidence scoring |
| **Humanization** | Transform AI text with adjustable intensity levels |
| **Tone Adjustment** | Modify text tone (formal, casual, professional, etc.) |
| **Grammar Correction** | Advanced grammar and style improvements |
| **Plagiarism Check** | Detect and highlight potential plagiarism |
| **SEO Optimization** | Optimize content for search engines |

### Content Transformation
| Feature | Description |
|---------|-------------|
| **Summarization** | Generate concise summaries of long content |
| **Expansion** | Expand brief content with relevant details |
| **Translation** | Translate between 50+ languages |
| **Simplification** | Reduce reading complexity |
| **Formalization** | Convert casual text to formal style |
| **Repurposing** | Adapt content for different platforms |

### Enterprise Features
| Feature | Description |
|---------|-------------|
| **Multi-Factor Auth** | TOTP-based two-factor authentication |
| **Team Collaboration** | Real-time document editing with presence |
| **Version Control** | Full document history with branching |
| **White-Label** | Customizable branding for resellers |
| **API Access** | RESTful API with comprehensive documentation |
| **Webhooks** | Event-driven integrations |

### Infrastructure
| Feature | Description |
|---------|-------------|
| **Auto-Scaling** | Kubernetes HPA for dynamic scaling |
| **Disaster Recovery** | Automated backups and failover |
| **CDN Integration** | Global content delivery |
| **Monitoring** | Prometheus metrics and Grafana dashboards |
| **Feature Flags** | Gradual rollouts and A/B testing |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                           │
│                    (Nginx Ingress Controller)                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Frontend    │    │   Backend     │    │   WebSocket   │
│   (React)     │    │   (Express)   │    │   Server      │
│   Port: 3000  │    │   Port: 8080  │    │   Port: 8080  │
└───────────────┘    └───────┬───────┘    └───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │   MongoDB     │    │    Redis      │
│  (Primary DB) │    │  (Documents)  │    │   (Cache)     │
│   Port: 5432  │    │   Port: 27017 │    │   Port: 6379  │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Data Flow

1. **Request Processing**: Client requests → Load Balancer → API Gateway
2. **Authentication**: JWT validation → Rate limiting → Request routing
3. **Business Logic**: Service layer → Database operations → Response
4. **Real-Time**: WebSocket connections → Operational transforms → Sync

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **API Client**: Axios with React Query
- **Real-Time**: Socket.io Client

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5.3
- **ORM**: Prisma (PostgreSQL) + Mongoose (MongoDB)
- **Caching**: Redis with ioredis
- **WebSocket**: Socket.io

### Databases
- **PostgreSQL**: User data, subscriptions, analytics
- **MongoDB**: Documents, versions, collaboration data
- **Redis**: Session cache, rate limiting, real-time sync

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes with Kustomize
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Structured JSON logging

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Docker & Docker Compose
- PostgreSQL 15+
- MongoDB 6+
- Redis 7+

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-humanizer.git
cd ai-humanizer
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start databases with Docker**
```bash
docker-compose up -d postgres mongodb redis
```

5. **Run database migrations**
```bash
cd packages/backend
npx prisma migrate dev
npx prisma db seed
```

6. **Start development servers**
```bash
# From root directory
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Docs: http://localhost:8080/api/docs

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=8080
API_VERSION=v1

# Database - PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/ai_humanizer

# Database - MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_humanizer

# Database - Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Cloud Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=ai-humanizer-storage
AWS_REGION=us-east-1

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

DROPBOX_APP_KEY=your-dropbox-key
DROPBOX_APP_SECRET=your-dropbox-secret

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_AI_DETECTION=true
ENABLE_COLLABORATION=true
ENABLE_ANALYTICS=true
```

### Kubernetes Configuration

See `k8s/README.md` for detailed Kubernetes deployment instructions.

---

## 📚 API Documentation

### Authentication

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### Text Processing

```bash
# Detect AI Content
POST /api/v1/detection/analyze
Authorization: Bearer <token>
{
  "text": "Your text to analyze...",
  "models": ["gpt", "claude", "gemini"]
}

# Humanize Text
POST /api/v1/transform/humanize
Authorization: Bearer <token>
{
  "text": "AI-generated text...",
  "level": "medium",
  "preserveFormatting": true
}

# Adjust Tone
POST /api/v1/tone/adjust
Authorization: Bearer <token>
{
  "text": "Your text...",
  "targetTone": "professional"
}
```

### Full API Reference

Access the interactive Swagger documentation at:
- Development: http://localhost:8080/api/docs
- Production: https://your-domain.com/api/docs

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secrets
- [ ] Set up SSL/TLS certificates
- [ ] Configure database connection pooling
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure backup schedules
- [ ] Review security headers

### Kubernetes Deployment

```bash
# Apply base configuration
kubectl apply -k k8s/

# Apply production overlay
kubectl apply -k k8s/overlays/production/

# Check deployment status
kubectl get pods -n ai-humanizer
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- **CI**: Linting, testing, and building on every PR
- **CD**: Automatic deployment to staging/production
- **Release**: Semantic versioning and changelog generation

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
cd packages/backend && npm test

# Run frontend tests only
cd packages/frontend && npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- packages/backend/src/auth/auth.test.ts
```

### Test Statistics

- **Total Tests**: 1,675
- **Test Files**: 57
- **Coverage**: Comprehensive unit and integration tests

### Test Categories

- Unit tests for all services
- Integration tests for API endpoints
- Property-based tests for core algorithms
- E2E tests for critical user flows

---

## 📁 Project Structure

```
ai-humanizer/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml              # Continuous Integration
│       ├── cd.yml              # Continuous Deployment
│       └── release.yml         # Release automation
├── docs/                       # Documentation
│   ├── DEVELOPER_GUIDE.md
│   ├── USER_GUIDE.md
│   └── TROUBLESHOOTING.md
├── k8s/                        # Kubernetes manifests
│   ├── overlays/
│   │   ├── development/
│   │   └── production/
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ...
├── packages/
│   ├── backend/                # Express.js API server
│   │   ├── prisma/             # Database schema & migrations
│   │   ├── src/
│   │   │   ├── api/            # API gateway & middleware
│   │   │   ├── auth/           # Authentication & authorization
│   │   │   ├── detection/      # AI detection service
│   │   │   ├── transform/      # Text transformation
│   │   │   ├── collaboration/  # Real-time collaboration
│   │   │   ├── monitoring/     # Metrics & logging
│   │   │   └── ...
│   │   └── package.json
│   ├── frontend/               # React application
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Page components
│   │   │   ├── context/        # React contexts
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── api/            # API client
│   │   │   └── store/          # State management
│   │   └── package.json
│   └── shared/                 # Shared types & utilities
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # Root package.json
├── tsconfig.base.json          # Base TypeScript config
├── LICENSE                     # MIT License
├── OWNERSHIP.md                # Ownership declaration
└── README.md                   # This file
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Use conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author & Ownership

**Mubvafhi Mueletshedzi Moses**

- Email: mubvafhimoses813@gmail.com
- Software ID: AIH-2024-MMM-001

This software is the exclusive intellectual property of Mubvafhi Mueletshedzi Moses. 
See [OWNERSHIP.md](OWNERSHIP.md) for complete ownership declaration.

---

## 🙏 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude
- The open-source community

---

<div align="center">

**Built with ❤️ by Mubvafhi Mueletshedzi Moses**

© 2024 All Rights Reserved | Software ID: AIH-2024-MMM-001

</div>
