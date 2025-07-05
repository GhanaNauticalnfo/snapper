# CI/CD with Kustomize Integration

## Overview

The GitHub Actions deployment pipeline has been updated to use Kustomize for managing image tags, aligning with GitOps principles and enabling ArgoCD integration.

## Changes Made

### 1. Kustomize Installation
The deployment workflow now installs kustomize during the deployment job.

### 2. Image Tag Management
Instead of using `kubectl set image`, the workflow now:
- Updates IMAGE_TAG placeholders in kustomization.yaml files
- Uses `kustomize edit set image` to update image references
- Applies the entire kustomization with `kubectl apply -k`

### 3. GitOps Integration (Optional)
For production deployments, the workflow can optionally commit the updated image tags back to the repository, maintaining a complete GitOps audit trail.

## How It Works

1. **Build Phase**: Docker images are built and tagged as before:
   - Production: `prod-<SHA>`
   - Test: `test-<BRANCH>-<SHA>`

2. **Deploy Phase**:
   ```bash
   # Navigate to the appropriate overlay
   cd k8s/overlays/${ENV_NAME}
   
   # Update image tags
   kustomize edit set image \
     ghananauticalinfo/ghanawaters-admin:IMAGE_TAG=ghananauticalinfo/ghanawaters-admin:${IMAGE_TAG}
   
   # Apply the kustomization
   kubectl apply -k .
   ```

3. **GitOps Commit** (Production only):
   - Commits updated kustomization.yaml files
   - Uses `[skip ci]` to prevent infinite loops

## Benefits

- ✅ **GitOps Ready**: ArgoCD can track actual deployed versions
- ✅ **Audit Trail**: All deployments are tracked in Git history
- ✅ **Easy Rollbacks**: Previous versions are just a Git revert away
- ✅ **Unified Structure**: Uses the same kustomize structure for both manual and CI/CD deployments

## Manual Override

If you need to manually update image tags:

```bash
cd k8s/overlays/dev
kustomize edit set image \
  ghananauticalinfo/ghanawaters-api:IMAGE_TAG=ghananauticalinfo/ghanawaters-api:my-custom-tag
kubectl apply -k .
```

## ArgoCD Integration

With these changes, you can now:

1. Apply ArgoCD applications:
   ```bash
   kubectl apply -f k8s/argocd-apps/ghanawaters-dev.yaml
   ```

2. ArgoCD will automatically sync when the CI/CD pipeline updates image tags

3. Manual syncs can be triggered from the ArgoCD UI

## Troubleshooting

### Image Tag Not Updating
Ensure the image name in kustomization.yaml matches exactly what's in the deployment manifests.

### Duplicate Image Entries
If you see duplicate entries after `kustomize edit`, manually edit the kustomization.yaml file to remove duplicates.

### GitOps Commit Failing
This is non-critical and usually due to concurrent updates. The deployment has already succeeded.