# Part 3: Architecture & Technology

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: Features →](PART_2_FEATURES.md) | [Next: Installation →](PART_4_INSTALLATION.md)

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [API Architecture](#api-architecture)
- [Real-Time Architecture](#real-time-architecture)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Scalability](#scalability)

---

## System Architecture

### High-Level Architecture

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
│   Port: 3000  │    │   Port: 3001  │    │   Port: 3001  │
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

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │  API Clients │      │
│  │   (React)    │  │  (Future)    │  │  (SDK)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Rate Limit  │  │  Auth/JWT    │  │  Validation   │      │
│  │  Middleware  │  │  Middleware  │  │  Middleware   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transform    │  │  Detection   │  │  Analytics   │      │
│  │  Service     │  │  Service     │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Collaboration│  │  Storage     │  │  ML Model    │      │
│  │  Service     │  │  Service     │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │   MongoDB    │  │    Redis     │      │
│  │ (Relational) │  │  (Documents) │  │   (Cache)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI     │  │  Anthropic   │  │  AWS Bedrock  │      │
│  │   API       │  │  API         │  │  API         │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Google Drive │  │   Dropbox    │  │  AWS S3      │      │
│  │  Integration │  │ Integration  │  │  Storage     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React** | 18.2.0 | UI framework | Component-based, large ecosystem |
| **TypeScript** | 5.3.2 | Type safety | Type safety, better DX |
| **Vite** | 5.0.8 | Build tool | Fast HMR, optimized builds |
| **Tailwind CSS** | 3.4.18 | Styling | Utility-first, fast development |
| **Zustand** | 5.0.8 | State management | Lightweight, simple API |
| **React Query** | 5.90.11 | Server state | Caching, synchronization |
| **React Router** | 6.21.0 | Routing | Declarative routing |
| **Socket.io Client** | - | Real-time | WebSocket communication |
| **Lucide React** | 0.555.0 | Icons | Modern, consistent icons |

### Backend Stack

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | 18+ | Runtime | JavaScript everywhere |
| **Express.js** | 4.18.2 | Web framework | Mature, flexible |
| **TypeScript** | 5.3.2 | Type safety | Type safety, better DX |
| **Prisma** | 6.19.0 | PostgreSQL ORM | Type-safe, migrations |
| **Mongoose** | 9.0.0 | MongoDB ODM | Flexible schema |
| **ioredis** | 5.8.2 | Redis client | Performance, clustering |
| **Socket.io** | - | WebSocket | Real-time communication |
| **JWT** | 9.0.2 | Authentication | Stateless auth |
| **bcrypt** | 5.1.1 | Password hashing | Secure hashing |
| **Winston** | 3.11.0 | Logging | Structured logging |
| **Swagger** | - | API docs | Interactive documentation |

### Database Stack

| Database | Version | Purpose | Why Chosen |
|----------|---------|---------|------------|
| **PostgreSQL** | 15+ | Primary database | ACID, relational data |
| **MongoDB** | 7+ | Document storage | Flexible schema, documents |
| **Redis** | 7+ | Caching | Fast, in-memory cache |

### AI/ML Stack

| Service | Purpose | Models |
|---------|---------|--------|
| **OpenAI API** | GPT models | GPT-4, GPT-3.5 |
| **Anthropic API** | Claude models | Claude 3 Opus, Sonnet, Haiku |
| **AWS Bedrock** | Enterprise models | Claude, Titan, Jurassic |
| **Google Gemini** | Gemini models | Gemini 2.0 Flash, 1.5 Pro |
| **Natural NLP** | Text processing | Tokenization, analysis |
| **Compromise** | NLP | Natural language processing |

### Infrastructure Stack

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local development |
| **Kubernetes** | Orchestration |
| **Nginx** | Reverse proxy |
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |

---

## Database Architecture

### PostgreSQL (Primary Database)

**Purpose**: Stores relational data (users, projects, subscriptions, etc.)

**Key Tables**:
- `users` - User accounts
- `projects` - User projects
- `subscriptions` - Subscription information
- `transformations` - Transformation records
- `sessions` - User sessions
- `api_keys` - API keys

**Features**:
- ACID compliance
- Foreign key constraints
- Indexes for performance
- Full-text search
- JSON support

### MongoDB (Document Storage)

**Purpose**: Stores documents, versions, and collaboration data

**Collections**:
- `documents` - Document content
- `versions` - Document versions
- `collaboration_sessions` - Collaboration data
- `analytics_events` - Analytics events

**Features**:
- Flexible schema
- Document storage
- High performance
- Horizontal scaling

### Redis (Caching)

**Purpose**: Caching, sessions, rate limiting

**Use Cases**:
- Session storage
- API response caching
- Rate limiting counters
- Real-time data
- Queue management

**Features**:
- In-memory storage
- High performance
- Pub/Sub for real-time
- Clustering support

---

## API Architecture

### API Gateway Pattern

```
Client Request
    │
    ▼
┌─────────────────┐
│  Rate Limiting  │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Authentication │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│   Validation    │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Route Handler  │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│   Service Layer │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│   Data Layer    │
└─────────────────┘
```

### API Versioning

- **Current Version**: `v1`
- **Version Prefix**: `/api/v1`
- **Future Versions**: `/api/v2`, `/api/v3`, etc.

### Rate Limiting

- **Relaxed**: 1000 requests / 15 minutes
- **Standard**: 100 requests / 15 minutes
- **Strict**: 10 requests / 15 minutes

---

## Real-Time Architecture

### WebSocket Server

```
Client Connection
    │
    ▼
┌─────────────────┐
│  Authentication │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Room Join      │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│ Operational     │
│ Transforms      │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  Broadcast      │
└─────────────────┘
```

### Operational Transforms

- **Conflict Resolution**: Automatic conflict resolution
- **Presence**: User presence indicators
- **Cursors**: Real-time cursor positions
- **Changes**: Real-time change broadcasting

---

## Security Architecture

### Authentication Flow

```
1. User Login
    │
    ▼
2. Credentials Validation
    │
    ▼
3. JWT Token Generation
    │
    ▼
4. Token Storage (Client)
    │
    ▼
5. Token Validation (Each Request)
```

### Authorization

- **Role-Based Access Control (RBAC)**
- **Resource-Level Permissions**
- **API Key Scopes**

### Data Encryption

- **In Transit**: TLS/SSL
- **At Rest**: Database encryption
- **Sensitive Data**: Field-level encryption

---

## Deployment Architecture

### Development

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───▶│ Backend  │───▶│ Databases│
│ (Vite)   │    │(Express) │    │ (Docker) │
└──────────┘    └──────────┘    └──────────┘
```

### Production

```
┌─────────────┐
│   CDN       │
└──────┬──────┘
       │
┌──────▼──────┐
│ Load Balancer│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│App 1│ │App 2│
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
┌──────▼──────┐
│  Databases  │
│ (Replicated)│
└─────────────┘
```

### Kubernetes

```
┌─────────────────┐
│  Ingress        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│Frontend│ │Backend│
│Deploy  │ │Deploy │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
    ┌────▼────┐
    │ StatefulSets│
    │ (Databases) │
    └────────────┘
```

---

## Scalability

### Horizontal Scaling

- **Stateless Services**: Frontend and backend are stateless
- **Load Balancing**: Distribute load across instances
- **Database Replication**: Read replicas for scaling reads
- **Caching**: Redis caching reduces database load

### Vertical Scaling

- **Resource Limits**: Configurable CPU/memory limits
- **Auto-Scaling**: Kubernetes HPA for automatic scaling
- **Performance Tuning**: Database and application tuning

### Performance Optimization

- **Caching Strategy**: Multi-layer caching
- **Database Indexing**: Optimized indexes
- **Query Optimization**: Efficient queries
- **CDN**: Content delivery network for static assets

---

## Data Flow

### Request Flow

```
1. Client Request
   │
   ▼
2. Load Balancer
   │
   ▼
3. API Gateway
   │
   ├─▶ Rate Limiting
   ├─▶ Authentication
   └─▶ Validation
   │
   ▼
4. Service Layer
   │
   ├─▶ Business Logic
   ├─▶ Data Processing
   └─▶ External APIs
   │
   ▼
5. Data Layer
   │
   ├─▶ PostgreSQL
   ├─▶ MongoDB
   └─▶ Redis
   │
   ▼
6. Response
```

### Transformation Flow

```
1. Text Input
   │
   ▼
2. Analysis
   │
   ├─▶ Language Detection
   ├─▶ Content Analysis
   └─▶ Protected Segments
   │
   ▼
3. Model Selection
   │
   ├─▶ User Tier
   ├─▶ Text Length
   └─▶ Strategy
   │
   ▼
4. LLM Processing
   │
   ├─▶ OpenAI
   ├─▶ Anthropic
   ├─▶ AWS Bedrock
   └─▶ Google Gemini
   │
   ▼
5. Post-Processing
   │
   ├─▶ Formatting
   ├─▶ Validation
   └─▶ Metrics
   │
   ▼
6. Response
```

---

[← Back to README](../README.md) | [Previous: Features →](PART_2_FEATURES.md) | [Next: Installation →](PART_4_INSTALLATION.md)

