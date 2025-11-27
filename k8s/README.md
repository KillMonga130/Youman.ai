# AI Humanizer Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the AI Humanizer platform.

## Requirements

- Kubernetes 1.25+
- kubectl configured with cluster access
- kustomize (built into kubectl 1.14+)
- NGINX Ingress Controller
- cert-manager (for TLS certificates)

## Directory Structure

```
k8s/
├── namespace.yaml           # Namespace definition
├── configmap.yaml           # ConfigMaps for application configuration
├── secrets.yaml             # Secrets (use external secret management in production)
├── rbac.yaml                # Service accounts, roles, and network policies
├── services.yaml            # Kubernetes Services for service discovery
├── backend-deployment.yaml  # Backend API deployment
├── frontend-deployment.yaml # Frontend web deployment
├── postgres-statefulset.yaml # PostgreSQL StatefulSet
├── mongodb-statefulset.yaml  # MongoDB StatefulSet
├── redis-statefulset.yaml    # Redis StatefulSet
├── hpa.yaml                 # Horizontal Pod Autoscalers
├── pdb.yaml                 # Pod Disruption Budgets
├── resource-quotas.yaml     # Resource quotas and limits
├── ingress.yaml             # Ingress configuration
├── kustomization.yaml       # Kustomize base configuration
└── overlays/
    ├── development/         # Development environment overlay
    │   └── kustomization.yaml
    └── production/          # Production environment overlay
        └── kustomization.yaml
```

## Deployment

### Prerequisites

1. Create the namespace:
   ```powershell
   kubectl apply -f k8s/namespace.yaml
   ```

2. Update secrets in `k8s/secrets.yaml` with actual values (or use external secret management)

3. Update domain names in `k8s/ingress.yaml` and `k8s/configmap.yaml`

### Deploy to Development

```powershell
# Preview the deployment
kubectl kustomize k8s/overlays/development

# Apply the deployment
kubectl apply -k k8s/overlays/development
```

### Deploy to Production

```powershell
# Preview the deployment
kubectl kustomize k8s/overlays/production

# Apply the deployment
kubectl apply -k k8s/overlays/production
```

### Deploy Base Configuration

```powershell
# Apply base configuration directly
kubectl apply -k k8s/
```

## Health Checks

The backend service exposes health check endpoints:

- **Liveness Probe**: `GET /health` - Returns 200 if the service is running
- **Readiness Probe**: `GET /health` - Returns 200 if the service is ready to accept traffic
- **Startup Probe**: `GET /health` - Used during container startup

The frontend service exposes:

- **Liveness Probe**: `GET /health` - Returns 200 if nginx is running
- **Readiness Probe**: `GET /ready` - Returns 200 if the service is ready

## Horizontal Pod Autoscaling

The deployment includes HPA configurations:

### Backend HPA
- Min replicas: 3 (production: 5)
- Max replicas: 20 (production: 50)
- Target CPU utilization: 70%
- Target memory utilization: 80%

### Frontend HPA
- Min replicas: 2 (production: 3)
- Max replicas: 10 (production: 20)
- Target CPU utilization: 70%
- Target memory utilization: 80%

## Resource Limits

### Backend
- Requests: 250m CPU, 512Mi memory
- Limits: 1000m CPU, 1Gi memory

### Frontend
- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 256Mi memory

### Databases
- PostgreSQL: 250m-1000m CPU, 512Mi-2Gi memory
- MongoDB: 250m-1000m CPU, 512Mi-2Gi memory
- Redis: 100m-500m CPU, 256Mi-1Gi memory

## Service Discovery

Services are accessible within the cluster using DNS:

- Backend: `backend-service.ai-humanizer.svc.cluster.local:3001`
- Frontend: `frontend-service.ai-humanizer.svc.cluster.local:80`
- PostgreSQL: `postgres-service.ai-humanizer.svc.cluster.local:5432`
- MongoDB: `mongodb-service.ai-humanizer.svc.cluster.local:27017`
- Redis: `redis-service.ai-humanizer.svc.cluster.local:6379`

## Monitoring

The backend exposes Prometheus metrics at `/monitoring/metrics`. Configure your Prometheus instance to scrape this endpoint.

Pod annotations for Prometheus scraping:
```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "3001"
prometheus.io/path: "/monitoring/metrics"
```

## Security

### Network Policies
- Backend pods can only receive traffic from ingress and frontend
- Database pods can only receive traffic from backend
- All pods can make DNS queries

### RBAC
- Backend service account has read-only access to ConfigMaps, Secrets, Services, and Pods

### TLS
- Ingress is configured for TLS termination using cert-manager
- Update the `cert-manager.io/cluster-issuer` annotation with your issuer

## Troubleshooting

### Check pod status
```powershell
kubectl get pods -n ai-humanizer
```

### View pod logs
```powershell
kubectl logs -n ai-humanizer deployment/backend
```

### Describe a pod
```powershell
kubectl describe pod -n ai-humanizer <pod-name>
```

### Check HPA status
```powershell
kubectl get hpa -n ai-humanizer
```

### Check resource usage
```powershell
kubectl top pods -n ai-humanizer
```

## Production Considerations

1. **Secrets Management**: Use external secret management (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **Database**: Consider using managed database services (RDS, Atlas, ElastiCache)
3. **Storage**: Use appropriate storage classes for your cloud provider
4. **Monitoring**: Set up Prometheus, Grafana, and alerting
5. **Logging**: Configure centralized logging (ELK, CloudWatch, etc.)
6. **Backup**: Implement database backup strategies
7. **Disaster Recovery**: Set up multi-region deployment if required
