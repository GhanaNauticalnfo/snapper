# ArgoCD Documentation

## Overview

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes. In the Ghana Waters infrastructure, ArgoCD automatically syncs and deploys applications from Git repositories to the Kubernetes cluster.

## Accessing the ArgoCD UI

The ArgoCD UI is not publicly exposed by default. To access it locally, use port forwarding:

```bash
# Forward ArgoCD server to localhost:8080
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then access the UI at: https://localhost:8080

**Note**: You'll see a certificate warning since ArgoCD uses a self-signed certificate. This is safe to ignore for local access.

## Authentication

### Username
The default username is: `admin`

### Password
The admin password is stored in a Kubernetes secret. To retrieve it:

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d
```

### First Login
1. Start port forwarding as shown above
2. Navigate to https://localhost:8080
3. Accept the certificate warning
4. Login with username `admin` and the password retrieved from the secret

## Common Operations

### Check Application Status
```bash
# List all ArgoCD applications
kubectl get applications -n argocd

# Check specific application status
kubectl get application ghanawaters-test -n argocd

# Get detailed application info
kubectl describe application ghanawaters-test -n argocd
```

### Sync Applications
While ArgoCD automatically syncs changes from Git, you can manually trigger a sync:

```bash
# Sync an application
argocd app sync ghanawaters-test

# Or using kubectl
kubectl patch application ghanawaters-test -n argocd --type merge -p '{"operation": {"initiatedBy": {"username": "admin"}, "sync": {}}}'
```

### View Application Logs
```bash
# Get ArgoCD controller logs
kubectl logs -n argocd deployment/argocd-application-controller

# Get sync operation logs
kubectl logs -n argocd deployment/argocd-repo-server
```

## GitOps Workflow

ArgoCD follows a GitOps workflow for Ghana Waters:

1. **Source of Truth**: Git repository contains all Kubernetes manifests
2. **Automatic Sync**: ArgoCD monitors Git for changes
3. **Deployment**: Changes in Git are automatically applied to the cluster
4. **Drift Detection**: ArgoCD alerts if cluster state differs from Git

### Directory Structure
```
k8s/
├── base/                 # Base Kubernetes resources
│   ├── api/
│   ├── admin/
│   └── frontend/
└── overlays/            # Environment-specific configurations
    ├── test/
    ├── dev/
    └── prod/
```

### Making Changes
1. Edit Kubernetes manifests in Git
2. Commit and push changes
3. ArgoCD detects changes and syncs automatically
4. Monitor sync status in ArgoCD UI or CLI

## ArgoCD Applications

Ghana Waters uses ArgoCD applications for each environment:

- `ghanawaters-test`: Test environment
- `ghanawaters-dev`: Development environment
- `ghanawaters-prod`: Production environment (if configured)

## Troubleshooting

### Application Not Syncing
1. Check application status:
   ```bash
   kubectl get application <app-name> -n argocd -o yaml
   ```
2. Look for sync errors in the status section
3. Check ArgoCD controller logs for detailed errors

### Manual Overrides Detected
If someone used `kubectl` to modify resources directly:
1. ArgoCD will show "OutOfSync" status
2. Either revert manual changes or sync from Git to overwrite

### Authentication Issues
If you can't login:
1. Verify the secret exists:
   ```bash
   kubectl get secret argocd-initial-admin-secret -n argocd
   ```
2. Reset admin password if needed:
   ```bash
   argocd admin initial-password -n argocd
   ```

### Port Forwarding Issues
If port forwarding fails:
1. Check if another process is using port 8080
2. Try a different port:
   ```bash
   kubectl port-forward svc/argocd-server -n argocd 8081:443
   ```
3. Ensure you have kubectl access to the cluster

## Best Practices

1. **Never modify resources directly** - Always make changes through Git
2. **Monitor sync status** - Check ArgoCD regularly for sync failures
3. **Use automated sync** - Let ArgoCD handle deployments automatically
4. **Review diffs** - Check what will change before syncing
5. **Keep secrets separate** - Don't commit secrets to Git

## Additional Resources

- [ArgoCD Official Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD CLI Installation](https://argo-cd.readthedocs.io/en/stable/cli_installation/)
- [GitOps Principles](https://www.gitops.tech/)