# Part 4: Installation & Setup

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: Architecture →](PART_3_ARCHITECTURE.md) | [Next: Configuration →](PART_5_CONFIGURATION.md)

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
- [Docker Setup](#docker-setup)
- [Local Development Setup](#local-development-setup)
- [Production Setup](#production-setup)
- [Kubernetes Setup](#kubernetes-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

Before installing AI Humanizer, ensure you have the following installed:

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Node.js** | 18.0.0+ | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0.0+ | Package manager | (comes with Node.js) |
| **Docker** | 20.10+ | Containerization | [docker.com](https://www.docker.com/get-started) |
| **Docker Compose** | 2.0+ | Multi-container orchestration | (comes with Docker) |
| **Git** | 2.30+ | Version control | [git-scm.com](https://git-scm.com/) |

### Optional Software

| Software | Version | Purpose | When Needed |
|----------|---------|---------|------------|
| **PostgreSQL** | 15+ | Database (if not using Docker) | Local development |
| **MongoDB** | 6+ | Document store (if not using Docker) | Local development |
| **Redis** | 7+ | Cache (if not using Docker) | Local development |
| **Kubernetes** | 1.24+ | Orchestration | Production deployment |
| **kubectl** | 1.24+ | Kubernetes CLI | Production deployment |

### System Requirements

#### Minimum Requirements (Development)

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux

#### Recommended Requirements (Production)

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50+ GB SSD
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Network**: Stable internet connection

### API Keys Required

You'll need API keys for AI services (at least one):

- **OpenAI API Key**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic API Key**: [console.anthropic.com](https://console.anthropic.com/)
- **AWS Credentials**: For AWS Bedrock (optional)
- **Google API Key**: For Gemini (optional)

---

## Quick Start Guide

### Option 1: Docker (Recommended - 5 Minutes)

The fastest way to get started is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-humanizer.git
cd ai-humanizer

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env and add your API keys
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# 4. Start all services
docker-compose up -d --build

# 5. Wait for services to be ready (about 30 seconds)
docker-compose ps

# 6. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

**That's it!** The application is now running.

### Option 2: Local Development (10 Minutes)

For development, you may want to run services locally:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-humanizer.git
cd ai-humanizer

# 2. Install dependencies
npm install

# 3. Start databases with Docker (or use local instances)
docker-compose up -d postgres mongodb redis

# 4. Set up environment variables
# Backend
cp packages/backend/.env.example packages/backend/.env
# Edit packages/backend/.env with your configuration

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
# Edit packages/frontend/.env with your configuration

# 5. Set up database
cd packages/backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: adds test data

# 6. Start development servers
# From root directory
npm run dev

# Or start separately:
# Terminal 1: Backend
cd packages/backend && npm run dev

# Terminal 2: Frontend
cd packages/frontend && npm run dev
```

---

## Docker Setup

### Docker Compose Configuration

The project includes a `docker-compose.yml` file that sets up:

- **Backend API**: Express.js server
- **Frontend**: React application
- **PostgreSQL**: Primary database
- **MongoDB**: Document storage
- **Redis**: Caching and sessions

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres mongodb redis

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache
```

### Environment Variables for Docker

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3001

# Databases
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_humanizer
MONGODB_URI=mongodb://mongodb:27017/ai_humanizer
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# CORS
CORS_ORIGINS=http://localhost:3000
```

### Docker Volumes

Data is persisted in Docker volumes:

- `postgres_data`: PostgreSQL data
- `mongodb_data`: MongoDB data
- `redis_data`: Redis data

To backup volumes:

```bash
# Backup PostgreSQL
docker run --rm -v ai-humanizer_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Backup MongoDB
docker run --rm -v ai-humanizer_mongodb_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mongodb_backup.tar.gz -C /data .
```

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspaces
```

### Step 2: Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start only databases
docker-compose up -d postgres mongodb redis
```

#### Option B: Local Installation

**PostgreSQL:**
```bash
# Windows (using Chocolatey)
choco install postgresql

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
createdb ai_humanizer
```

**MongoDB:**
```bash
# Windows (using Chocolatey)
choco install mongodb

# macOS (using Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu/Debian)
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Redis:**
```bash
# Windows (using Chocolatey)
choco install redis-64

# macOS (using Homebrew)
brew install redis
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### Step 3: Environment Configuration

**Backend Environment** (`packages/backend/.env`):

```env
NODE_ENV=development
PORT=3001

# Database - PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_humanizer

# Database - MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_humanizer

# Database - Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=development-secret-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS
CORS_ORIGINS=http://localhost:3000

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Cloud Storage (optional)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=ai-humanizer-storage
AWS_REGION=us-east-1

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-key
```

**Frontend Environment** (`packages/frontend/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_ENABLE_ANALYTICS=true
```

### Step 4: Database Migration

```bash
cd packages/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### Step 5: Start Development Servers

**Option A: From Root (Recommended)**

```bash
# Start both backend and frontend
npm run dev
```

**Option B: Separate Terminals**

```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend
cd packages/frontend
npm run dev
```

### Step 6: Verify Installation

1. **Backend Health Check**: http://localhost:3001/api/health
2. **Frontend**: http://localhost:3000
3. **API Docs**: http://localhost:3001/api/docs
4. **Database Connections**: Check logs for connection success

---

## Production Setup

### Prerequisites

- Production server (Linux recommended)
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- Database backups configured
- Monitoring set up

### Step 1: Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/ai-humanizer.git
cd ai-humanizer

# Create production .env
cp .env.example .env.production

# Edit .env.production with production values
nano .env.production
```

### Step 3: Production Environment Variables

```env
NODE_ENV=production
PORT=3001

# Use strong, random secrets
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# Production database URLs
DATABASE_URL=postgresql://user:password@db-host:5432/ai_humanizer
MONGODB_URI=mongodb://mongo-host:27017/ai_humanizer
REDIS_URL=redis://redis-host:6379

# Production CORS
CORS_ORIGINS=https://yourdomain.com

# Production API keys
OPENAI_API_KEY=sk-prod-key
ANTHROPIC_API_KEY=sk-ant-prod-key

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.crt
SSL_KEY_PATH=/etc/ssl/private/yourdomain.key
```

### Step 4: Build and Deploy

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Step 5: Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### Step 6: Set Up Monitoring

See [Deployment Guide](PART_8_DEPLOYMENT.md#monitoring--logging) for monitoring setup.

---

## Kubernetes Setup

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Kustomize installed

### Step 1: Configure Environment

```bash
# Edit k8s/overlays/production/kustomization.yaml
# Update image tags, resource limits, etc.
```

### Step 2: Apply Configuration

```bash
# Apply base configuration
kubectl apply -k k8s/

# Apply production overlay
kubectl apply -k k8s/overlays/production/

# Check deployment status
kubectl get pods -n ai-humanizer

# View logs
kubectl logs -f deployment/backend -n ai-humanizer
```

### Step 3: Configure Ingress

```bash
# Apply ingress configuration
kubectl apply -f k8s/ingress.yaml

# Check ingress
kubectl get ingress -n ai-humanizer
```

See `k8s/README.md` for detailed Kubernetes documentation.

---

## Verification

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "version": "1.0.0",
#   "databases": {
#     "postgresql": "connected",
#     "mongodb": "connected",
#     "redis": "connected"
#   }
# }
```

### Database Connections

```bash
# PostgreSQL
docker exec -it ai-humanizer-postgres-1 psql -U postgres -d ai_humanizer -c "SELECT 1;"

# MongoDB
docker exec -it ai-humanizer-mongodb-1 mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec -it ai-humanizer-redis-1 redis-cli ping
```

### API Endpoints

```bash
# API version info
curl http://localhost:3001/api/v1

# API documentation
open http://localhost:3001/api/docs
```

### Frontend

1. Open http://localhost:3000
2. Check browser console for errors
3. Try registering a new account
4. Create a test project

---

## Troubleshooting

### Common Issues

#### Backend Won't Start

**Problem**: Backend fails to start

**Solutions**:
```bash
# Check database connections
docker-compose ps

# Check backend logs
docker-compose logs backend

# Verify environment variables
cat packages/backend/.env

# Test database connections manually
psql $DATABASE_URL
```

#### Database Connection Errors

**Problem**: Cannot connect to database

**Solutions**:
```bash
# Check if databases are running
docker-compose ps postgres mongodb redis

# Restart databases
docker-compose restart postgres mongodb redis

# Check connection strings in .env
# Ensure DATABASE_URL, MONGODB_URI, REDIS_URL are correct
```

#### Frontend Shows Errors

**Problem**: Frontend displays errors or blank page

**Solutions**:
```bash
# Check browser console (F12)
# Verify VITE_API_URL in frontend/.env
# Ensure backend is running
curl http://localhost:3001/api/health

# Clear browser cache
# Restart frontend
cd packages/frontend && npm run dev
```

#### CORS Errors

**Problem**: CORS errors in browser console

**Solutions**:
```bash
# Add frontend URL to CORS_ORIGINS in backend/.env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Restart backend
docker-compose restart backend
```

#### Port Already in Use

**Problem**: Port 3000 or 3001 already in use

**Solutions**:
```bash
# Find process using port
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000

# Kill process or change port in .env
PORT=3002
```

### Getting Help

- Check [Troubleshooting Guide](../TROUBLESHOOTING.md)
- Review logs: `docker-compose logs -f`
- Check GitHub Issues
- Contact support: mubvafhimoses813@gmail.com

---

## Next Steps

After installation:

1. **[Configuration Guide](PART_5_CONFIGURATION.md)**: Configure environment variables
2. **[User Guide](PART_9_USER_GUIDE.md)**: Learn how to use the platform
3. **[API Documentation](PART_6_API_DOCS.md)**: Integrate via API
4. **[Deployment Guide](PART_8_DEPLOYMENT.md)**: Deploy to production

---

[← Back to README](../README.md) | [Previous: Architecture →](PART_3_ARCHITECTURE.md) | [Next: Configuration →](PART_5_CONFIGURATION.md)

