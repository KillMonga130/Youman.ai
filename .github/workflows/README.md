# GitHub Actions CI/CD Workflows

This directory contains the GitHub Actions workflows for the AI Humanizer platform.

## Workflows Overview

### CI Pipeline (`ci.yml`)

Triggered on push to `main`, `develop`, `feature/**`, and `release/**` branches, and on pull requests.

**Jobs:**
- **Lint & Type Check**: Runs ESLint, Prettier, and TypeScript type checking
- **Backend Tests**: Runs backend unit and integration tests with PostgreSQL, MongoDB, and Redis services
- **Frontend Tests**: Runs frontend unit tests
- **Build Docker Images**: Builds and pushes Docker images to GitHub Container Registry
- **Security Scan**: Runs Trivy vulnerability scanner

### CD Pipeline (`cd.yml`)

Triggered after successful CI pipeline completion on the `main` branch, or manually via workflow dispatch.

**Features:**
- Blue-green deployment strategy
- Automated smoke tests
- Automatic rollback on failure
- Staging and production environments
- Manual approval required for production deployments

**Jobs:**
- **Prepare**: Determines deployment environment and version
- **Deploy to Staging**: Deploys to staging environment with smoke tests
- **Deploy to Production**: Deploys to production with extended health checks (requires approval)
- **Cleanup**: Removes old container images

### Release Pipeline (`release.yml`)

Triggered on version tags (`v*.*.*`) or manually via workflow dispatch.

**Features:**
- Semantic versioning validation
- Automated changelog generation
- GitHub Release creation
- Production deployment for stable releases

### PR Validation (`pr-validation.yml`)

Triggered on pull request events.

**Jobs:**
- **Validate PR**: Checks PR title follows conventional commits
- **Breaking Changes**: Detects breaking changes in PR
- **Code Quality**: Checks for console.log statements and TODO comments
- **Size Check**: Validates frontend bundle size
- **Dependency Audit**: Runs npm audit

### Manual Rollback (`rollback.yml`)

Manually triggered workflow for emergency rollbacks.

**Features:**
- Rollback to previous version
- Rollback to specific version
- Confirmation required (type "ROLLBACK")
- Automatic rollback record creation

### Scheduled Maintenance (`scheduled-maintenance.yml`)

Runs daily at 2 AM UTC or manually triggered.

**Jobs:**
- **Cleanup Images**: Removes old container images
- **Security Scan**: Runs vulnerability scans
- **Dependency Check**: Checks for outdated dependencies
- **Cleanup Workflows**: Removes old workflow runs

## Environment Setup

### Required Secrets

| Secret | Description |
|--------|-------------|
| `KUBE_CONFIG_STAGING` | Base64-encoded kubeconfig for staging cluster |
| `KUBE_CONFIG_PRODUCTION` | Base64-encoded kubeconfig for production cluster |

### Required Variables

| Variable | Description |
|----------|-------------|
| `CURRENT_DEPLOYMENT_SLOT` | Current active deployment slot (blue/green) |

### Environment Protection Rules

**Staging:**
- No approval required
- Deployment branches: `main`, `develop`

**Production:**
- Required reviewers: 2
- Wait timer: 5 minutes
- Deployment branches: `main`

## Deployment Strategy

### Blue-Green Deployment

The platform uses blue-green deployment for zero-downtime releases:

1. **Prepare**: Determine which slot (blue/green) is currently inactive
2. **Deploy**: Deploy new version to inactive slot
3. **Test**: Run smoke tests against new deployment
4. **Switch**: Update traffic routing to new slot
5. **Cleanup**: Keep old slot for quick rollback

### Rollback Process

**Automatic Rollback:**
- Triggered when smoke tests fail
- Uses `kubectl rollout undo` to revert to previous version

**Manual Rollback:**
- Use the "Manual Rollback" workflow
- Can rollback to previous version or specific version
- Requires confirmation by typing "ROLLBACK"

## Docker Images

Images are pushed to GitHub Container Registry:

- Backend: `ghcr.io/{owner}/{repo}/backend:{tag}`
- Frontend: `ghcr.io/{owner}/{repo}/frontend:{tag}`

### Image Tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release (main branch) |
| `{sha}` | Specific commit SHA |
| `{branch}` | Branch name |
| `{version}` | Semantic version (releases only) |

## Monitoring

### Deployment Status

Deployment status is reported via:
- GitHub commit status checks
- Workflow run annotations
- Issue creation for rollbacks

### Alerts

Configure alerts in your monitoring system for:
- Failed deployments
- Rollback events
- Security vulnerabilities
- Outdated dependencies

## Troubleshooting

### Common Issues

**Build fails with "npm ci" error:**
- Check if `package-lock.json` is up to date
- Ensure Node.js version matches workflow configuration

**Deployment fails with "kubectl" error:**
- Verify kubeconfig secret is correctly encoded
- Check cluster connectivity and permissions

**Smoke tests fail:**
- Check application logs in Kubernetes
- Verify health check endpoints are responding
- Check service connectivity

### Debug Mode

To enable debug logging, add the following secret:
- `ACTIONS_STEP_DEBUG`: `true`
