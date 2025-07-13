# Keycloak Deployment

This directory contains the Kubernetes deployment configuration for Keycloak, which provides authentication and authorization for all Ghana Waters environments.

## Architecture

- **Single Keycloak Instance**: One Keycloak deployment serving all environments
- **Multiple Realms**: Separate realms for dev, test, and prod environments
- **Dedicated Namespace**: Deployed in `ghanawaters-keycloak` namespace
- **PostgreSQL Backend**: Dedicated PostgreSQL database for Keycloak data

## Deployment

### 1. Create Secrets

First, create the required secrets:

```bash
./create-secrets.sh
```

This creates:
- `keycloak-admin-secret`: Admin credentials for Keycloak
- `keycloak-postgres-secret`: PostgreSQL database credentials

### 2. Deploy via ArgoCD

Apply the ArgoCD application:

```bash
kubectl apply -f ../../argocd-apps/keycloak.yaml
```

### 3. Access Keycloak

Once deployed, Keycloak will be available at:
- URL: https://keycloak.ghananautical.info
- Admin Console: https://keycloak.ghananautical.info/admin
- Username: admin
- Password: NplmjCW6jTOdzBTtftmLggd9vkmZl6zZx8Q6t7l2MVE=

### 4. Configure Realms

After deployment, configure the three realms:

1. **ghanawaters-dev**: Development environment
2. **ghanawaters-test**: Test environment  
3. **ghanawaters-prod**: Production environment

Each realm should have:
- Appropriate client configurations for API, Admin, and Frontend apps
- User roles: admin, operator, viewer
- Redirect URIs for each environment

## Certificate Management

The deployment starts with Let's Encrypt staging certificate. To switch to production:

1. Edit `k8s/base/keycloak/ingress.yaml`
2. Change `letsencrypt-staging` to `letsencrypt-prod`
3. Commit and push the change
4. ArgoCD will automatically sync the change

## Maintenance

### Backup

Keycloak data is stored in PostgreSQL. Regular backups should be configured for the `keycloak-postgres-pvc` volume.

### Updates

To update Keycloak version:
1. Edit `k8s/base/keycloak/deployment.yaml`
2. Update the image tag
3. Commit and push
4. ArgoCD will handle the rolling update

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n ghanawaters-keycloak
```

### View logs
```bash
kubectl logs -n ghanawaters-keycloak deployment/keycloak
kubectl logs -n ghanawaters-keycloak deployment/keycloak-postgres
```

### Access PostgreSQL
```bash
kubectl exec -it -n ghanawaters-keycloak deployment/keycloak-postgres -- psql -U keycloak
```