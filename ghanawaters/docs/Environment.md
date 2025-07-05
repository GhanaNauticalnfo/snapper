# Environment Configuration and Database Migrations

This document describes the environment setup, configuration, and database migration strategy for the Ghana Waters application across all three environments: Development (dev), Test, and Production (prod).

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Kubernetes Namespace Structure](#kubernetes-namespace-structure)
3. [Deployment Methods](#deployment-methods)
4. [Database Migration Strategy](#database-migration-strategy)
5. [Migration Implementation Details](#migration-implementation-details)
6. [Environment-Specific Configuration](#environment-specific-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Environment Overview

The Ghana Waters application runs in three distinct environments:

| Environment | Namespace | Deployment Method | Domain |
|-------------|-----------|------------------|---------|
| Development | ghanawaters-dev | ArgoCD | ghanawaters-dev-api.ghananautical.info |
| Test | ghanawaters-test | GitHub Actions + kubectl | ghanawaters-test-api.ghananautical.info |
| Production | ghanawaters-prod | GitHub Actions + kubectl | ghanawaters-api.ghananautical.info |

### Key Differences

- **Development**: Uses ArgoCD for GitOps-based continuous deployment
- **Test/Production**: Use GitHub Actions workflows with direct kubectl apply

## Kubernetes Namespace Structure

Each environment runs in its own Kubernetes namespace with the following resources:

```
ghanawaters-{env}/
├── Deployments
│   ├── ghanawaters-api
│   ├── ghanawaters-admin
│   ├── ghanawaters-frontend
│   └── ghanawaters-postgres
├── Services
│   ├── ghanawaters-api-service
│   ├── ghanawaters-admin-service
│   ├── ghanawaters-frontend-service
│   └── ghanawaters-postgres-service
├── Ingresses
│   ├── ghanawaters-api-ingress
│   ├── ghanawaters-admin-ingress
│   └── ghanawaters-frontend-ingress
├── Jobs
│   └── ghanawaters-api-migrations
└── Secrets
    └── ghanawaters-postgres-secret
```

## Deployment Methods

### Development Environment (ArgoCD)

The development environment uses ArgoCD for automated GitOps deployments:

```yaml
# k8s/argocd-apps/ghanawaters-dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ghanawaters-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/GhanaNauticalnfo/snapper.git
    targetRevision: HEAD
    path: k8s/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: ghanawaters-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Test/Production Environments (GitHub Actions)

Test and Production use GitHub Actions workflows with Kustomize:

```bash
# Deploy process in GitHub Actions
kustomize edit set image ghananauticalinfo/ghanawaters-api:${IMAGE_TAG}
kubectl apply -k .
```

## Database Migration Strategy

### Overview

Database migrations are handled automatically using Kubernetes Jobs with the following features:

1. **PostSync Execution**: Migrations run after application deployment
2. **Automatic Cleanup**: Jobs self-delete after 5 minutes
3. **Zero Downtime**: Applications deploy first, then migrations run
4. **Environment-Specific Commands**: Different migration commands per environment

### Migration Flow

```
1. Application Deployment
   ├── New pods are created with updated code
   ├── InitContainer waits for database availability
   └── Old pods continue serving traffic

2. Migration Execution (PostSync)
   ├── Migration job starts after deployment
   ├── Runs environment-specific migration command
   └── Updates database schema

3. Application Startup
   ├── InitContainer detects migrations complete
   ├── Main container starts
   └── New pods become ready

4. Cleanup
   ├── Old pods are terminated
   └── Migration job auto-deletes after 5 minutes
```

## Migration Implementation Details

### Base Migration Job

The base migration job includes ArgoCD annotations and auto-cleanup:

```yaml
# k8s/base/jobs/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ghanawaters-api-migrations
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  ttlSecondsAfterFinished: 300  # Auto-delete after 5 minutes
  backoffLimit: 3
  template:
    spec:
      containers:
      - name: migrations
        image: ghananauticalinfo/ghanawaters-api:latest
        command: ["/bin/sh", "-c"]
        args:
          - |
            cd /app
            echo "Running migrations for ${NODE_ENV} environment..."
            npm run migration:run
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ghanawaters-postgres-secret
              key: DATABASE_URL
      restartPolicy: Never
```

### Environment-Specific Patches

Each environment applies patches to customize the migration command:

```yaml
# k8s/overlays/{env}/patches/migration-command.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ghanawaters-api-migrations
spec:
  template:
    spec:
      containers:
      - name: migrations
        args:
          - |
            cd /app
            echo "Running {ENV} migrations for ${NODE_ENV} environment..."
            npm run migration:run
```

### API Deployment InitContainer

The API deployment includes an initContainer that waits for migrations:

```yaml
# k8s/base/api/deployment.yaml (excerpt)
spec:
  template:
    spec:
      initContainers:
      - name: wait-for-migrations
        image: ghananauticalinfo/ghanawaters-api:latest
        command: ["/bin/sh", "-c"]
        args:
          - |
            echo "Checking if database migrations are complete..."
            max_attempts=60
            attempt=0
            
            while [ $attempt -lt $max_attempts ]; do
              if npm run migration:check 2>&1 | grep -q "No migrations are pending"; then
                echo "Database is ready - all migrations applied!"
                exit 0
              else
                echo "Waiting for migrations to complete..."
                sleep 5
                attempt=$((attempt + 1))
              fi
            done
            
            echo "WARNING: Timeout waiting for migrations, proceeding anyway..."
            exit 0
```

### Migration Commands

The following npm scripts are available for migrations:

```json
{
  "scripts": {
    "migration:run": "npm run typeorm:js -- migration:run",
    "migration:run:dev": "npm run typeorm:ts -- migration:run",
    "migration:revert": "npm run typeorm:js -- migration:revert",
    "migration:revert:dev": "npm run typeorm:ts -- migration:revert",
    "migration:check": "npm run typeorm:js -- migration:show",
    "migration:check:dev": "npm run typeorm:ts -- migration:show"
  }
}
```

## Environment-Specific Configuration

### Development Environment

```yaml
# k8s/overlays/dev/kustomization.yaml
namespace: ghanawaters-dev

resources:
- ../../base/admin
- ../../base/api
- ../../base/frontend
- ../../base/database
- ../../base/jobs

patches:
- path: patches/ingress-hosts.yaml
- path: patches/replicas.yaml
- path: patches/database-resources.yaml
- path: patches/node-env.yaml
- path: patches/migration-command.yaml

images:
- name: ghananauticalinfo/ghanawaters-api
  newTag: test-develop-{commit-sha}
```

### Test Environment

```yaml
# k8s/overlays/test/kustomization.yaml
namespace: ghanawaters-test

# Similar structure with test-specific configurations
```

### Production Environment

```yaml
# k8s/overlays/prod/kustomization.yaml
namespace: ghanawaters-prod

# Similar structure with production-specific configurations
```

## Troubleshooting

### Common Issues

#### 1. Migration Job Image Pull Errors

**Problem**: Migration job fails with `ImagePullBackOff`

**Solution**: Ensure the image tag in kustomization.yaml matches the built image:
```bash
kubectl describe job -n ghanawaters-{env} ghanawaters-api-migrations
```

#### 2. Migration Execution Failures

**Problem**: Migrations fail to run

**Check logs**:
```bash
kubectl logs -n ghanawaters-{env} -l job-name=ghanawaters-api-migrations
```

**Common causes**:
- Database connection issues
- Missing environment variables
- TypeScript compilation errors (in dev)

#### 3. ArgoCD Sync Issues (Dev Only)

**Problem**: ArgoCD fails to sync

**Solutions**:
```bash
# Force refresh
kubectl patch application -n argocd ghanawaters-dev \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"force"}}}'

# Check sync status
kubectl get application -n argocd ghanawaters-dev -o yaml
```

#### 4. API Access Issues

**Problem**: API returns 404 errors

**Note**: Due to ingress path rewriting in dev, the API is accessible at:
- External: `https://ghanawaters-dev-api.ghananautical.info/api/api/vessels`
- Internal: `http://ghanawaters-api-service/api/vessels`

### Manual Migration Execution

If automatic migrations fail, you can run them manually:

```bash
# Delete existing job
kubectl delete job -n ghanawaters-{env} ghanawaters-api-migrations

# Apply migrations manually
kustomize build k8s/overlays/{env} | \
  awk '/^apiVersion: batch\/v1$/{p=1} p&&/^---$/{exit} p' | \
  kubectl apply -f -

# Check logs
kubectl logs -n ghanawaters-{env} -l job-name=ghanawaters-api-migrations
```

## Best Practices

### 1. Migration Development

- **Test locally first**: Run migrations in development before deploying
- **Make migrations idempotent**: Migrations should be safe to run multiple times
- **Keep migrations small**: Break large changes into smaller migrations
- **Document breaking changes**: Note any migrations that require special handling

### 2. Deployment Process

- **Monitor migration logs**: Check migration job logs after deployment
- **Verify database state**: Ensure migrations completed successfully
- **Test rollback procedures**: Have a plan for reverting migrations if needed

### 3. Environment Management

- **Keep environments in sync**: Regularly sync test/prod with latest migrations
- **Use proper image tags**: Ensure consistent tagging across environments
- **Monitor resource usage**: Migration jobs can be resource-intensive

### 4. Security

- **Protect database credentials**: Use Kubernetes secrets for DATABASE_URL
- **Limit migration job permissions**: Jobs should only have database access
- **Audit migration changes**: Review migration files before deployment

### 5. Performance

- **Optimize large migrations**: Use batch operations for data migrations
- **Consider maintenance windows**: Schedule large migrations during low traffic
- **Monitor database locks**: Some migrations may lock tables temporarily

## Migration Job Lifecycle

### ArgoCD Environments (Dev)

1. **PreSync**: ArgoCD detects new commits
2. **Sync**: Application deployments are updated
3. **PostSync**: Migration job runs automatically
4. **Cleanup**: Job auto-deletes after ttlSecondsAfterFinished

### Direct Apply Environments (Test/Prod)

1. **GitHub Actions**: Builds and pushes new images
2. **Kustomize**: Updates image tags
3. **kubectl apply**: Deploys all resources including migration job
4. **Job execution**: Migration runs immediately
5. **Cleanup**: Job auto-deletes after ttlSecondsAfterFinished

## Database Connection Details

Each environment uses its own PostgreSQL instance with PostGIS extensions:

```yaml
DATABASE_URL: postgresql://ghanawaters_user:password@ghanawaters-postgres:5432/ghanawaters_db
```

The connection string is stored in `ghanawaters-postgres-secret` and includes:
- Host: ghanawaters-postgres (internal service name)
- Port: 5432
- Database: ghanawaters_db
- User: ghanawaters_user
- SSL: Disabled for internal connections

## Future Improvements

1. **Blue-Green Deployments**: For zero-downtime migrations in production
2. **Migration Versioning**: Track migration versions in a dedicated table
3. **Automated Rollbacks**: Implement automatic rollback on migration failure
4. **Migration Metrics**: Add Prometheus metrics for migration duration and success
5. **Schema Validation**: Pre-flight checks before running migrations