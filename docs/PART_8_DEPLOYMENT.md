# Part 8: Deployment & Operations

**AI Humanizer - Complete Documentation**

[← Back to README](../README.md) | [Previous: Development →](PART_7_DEVELOPMENT.md) | [Next: User Guide →](PART_9_USER_GUIDE.md)

---

## Table of Contents

- [Deployment Checklist](#deployment-checklist)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Scaling Guide](#scaling-guide)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Domain configured
- [ ] DNS records set up
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Security audit completed

### Production Configuration

- [ ] `NODE_ENV=production`
- [ ] Strong JWT secrets
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking set up
- [ ] Monitoring enabled
- [ ] Alerts configured

---

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      MONGODB_URI: ${MONGODB_URI}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    restart: always
    networks:
      - app-network

  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
    restart: always
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - app-network

  mongodb:
    image: mongo:7-jammy
    volumes:
      - mongodb_data:/data/db
    restart: always
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: always
    networks:
      - app-network

volumes:
  postgres_data:
  mongodb_data:

networks:
  app-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Kustomize installed

### Deploy to Kubernetes

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

### Kubernetes Manifests

See `k8s/README.md` for detailed Kubernetes documentation.

---

## Monitoring & Logging

### Prometheus Metrics

Metrics are exposed at `/metrics` endpoint:

```bash
curl http://localhost:3001/metrics
```

### Grafana Dashboards

Pre-built dashboards available:
- System metrics
- Application metrics
- Business metrics

### Logging

#### Log Levels

- `error`: Errors only
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `debug`: All logs

#### Log Format

Structured JSON logging:

```json
{
  "level": "info",
  "message": "User created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "userId": "uuid",
  "context": {}
}
```

### Health Checks

```bash
# Health check endpoint
curl http://localhost:3001/api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "databases": {
    "postgresql": "connected",
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

---

## Backup & Recovery

### Database Backups

#### PostgreSQL Backup

```bash
# Backup
docker exec ai-humanizer-postgres-1 pg_dump -U postgres ai_humanizer > backup.sql

# Restore
docker exec -i ai-humanizer-postgres-1 psql -U postgres ai_humanizer < backup.sql
```

#### MongoDB Backup

```bash
# Backup
docker exec ai-humanizer-mongodb-1 mongodump --out /backup

# Restore
docker exec ai-humanizer-mongodb-1 mongorestore /backup
```

### Automated Backups

Set up cron job for automated backups:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Backup Strategy

- **Daily**: Full database backup
- **Weekly**: Full system backup
- **Monthly**: Archive backups
- **Retention**: 30 days for daily, 90 days for weekly

---

## Scaling Guide

### Horizontal Scaling

#### Backend Scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Database Scaling

- **Read Replicas**: Scale read operations
- **Connection Pooling**: Optimize connections
- **Caching**: Reduce database load

### Vertical Scaling

Increase resource limits:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2000m"
    memory: "4Gi"
```

---

## Performance Optimization

### Caching Strategy

#### Redis Caching

```typescript
// Cache API responses
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const user = await getUserFromDB(userId);
await redis.setex(cacheKey, 3600, JSON.stringify(user));
return user;
```

#### CDN Configuration

- Static assets via CDN
- Cache headers configured
- Edge locations for global distribution

### Database Optimization

#### Indexes

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

#### Query Optimization

- Use indexes
- Avoid N+1 queries
- Use connection pooling
- Optimize joins

---

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms**: Out of memory errors

**Solutions**:
- Increase memory limits
- Optimize code
- Add caching
- Review memory leaks

#### Database Connection Issues

**Symptoms**: Connection timeouts

**Solutions**:
- Check connection pool size
- Verify database is running
- Check network connectivity
- Review connection strings

#### Slow API Responses

**Symptoms**: High response times

**Solutions**:
- Add caching
- Optimize database queries
- Scale horizontally
- Review external API calls

---

## Production Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Monitor Everything**: Set up comprehensive monitoring
3. **Automate Backups**: Automated backup strategy
4. **Test Recovery**: Regularly test recovery procedures
5. **Security Updates**: Keep dependencies updated
6. **Log Aggregation**: Centralized logging
7. **Alerting**: Set up alerts for critical issues
8. **Documentation**: Keep documentation updated

---

[← Back to README](../README.md) | [Previous: Development →](PART_7_DEVELOPMENT.md) | [Next: User Guide →](PART_9_USER_GUIDE.md)

