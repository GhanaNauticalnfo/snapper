# API Environment Variables Documentation

This document describes all environment variables used by the Ghana Waters API application.

## Overview

The API uses environment variables for configuration across different deployment environments:
- **Local Development**: Uses `.env.local` file (included in repository with localhost defaults)
- **Kubernetes Deployments**: Uses environment variables injected from Kubernetes Secrets

## Environment Variable Reference

### Core Application Settings

| Variable | Description | Default | Example Values |
|----------|-------------|---------|----------------|
| `NODE_ENV` | Application environment | `local` | `local`, `dev`, `test`, `prod` |
| `PORT` | API server port | `3000` | `3000` |
| `BUILD_TIME` | Build timestamp (set during CI/CD) | `unknown` | `2024-01-15T10:30:00Z` |
| `BUILD_TAG` | Build version tag (set during CI/CD) | `unknown` | `v1.2.3` |

### Database Configuration

| Variable | Description | Default | Example Values |
|----------|-------------|---------|----------------|
| `DATABASE_URL` | Full PostgreSQL connection string (preferred) | - | `postgresql://user:pass@host:5432/dbname` |
| `DATABASE_HOST` | Database hostname (if not using DATABASE_URL) | - | `localhost`, `postgres-service.prod.svc.cluster.local` |
| `DATABASE_PORT` | Database port | `5432` | `5432` |
| `DATABASE_USER` | Database username | - | `ghanawaters_user` |
| `DATABASE_PASSWORD` | Database password | - | `secure_password` |
| `DATABASE_NAME` | Database name | - | `ghanawaters_db` |
| `DATABASE_SSL` | Enable SSL for database connection | `false` (local), `true` (prod) | `true`, `false` |
| `TYPEORM_LOGGING` | Enable TypeORM query logging | `true` (dev), `false` (prod) | `true`, `false` |

### MQTT/NanoMQ Configuration

| Variable | Description | Default | Example Values |
|----------|-------------|---------|----------------|
| `MQTT_ENABLED` | Enable MQTT functionality | `true` | `true`, `false` |
| `MQTT_BROKER_URL` | MQTT broker connection URL | `mqtt://localhost:1883` | `mqtt://nanomq-service:1883` |
| `MQTT_API_PASSWORD` | Password for MQTT API authentication | `mqtt_api_password` | `secure_mqtt_password` |

### Keycloak Authentication

| Variable | Description | Default | Example Values |
|----------|-------------|---------|----------------|
| `KEYCLOAK_URL` | Keycloak server URL | `http://localhost:8080` | `https://keycloak.example.com` |
| `KEYCLOAK_REALM` | Keycloak realm name | `ghanawaters` | `ghanawaters` |
| `KEYCLOAK_CLIENT_ID` | Keycloak client ID for API | `ghanawaters-api` | `ghanawaters-api` |

### CORS Configuration

| Variable | Description | Default | Example Values |
|----------|-------------|---------|----------------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Based on NODE_ENV | `https://admin.example.com,https://app.example.com` |

## Environment-Specific Examples

### Local Development (.env.local)
```bash
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=ghanawaters_user
DATABASE_PASSWORD=ghanawaters_password
DATABASE_NAME=ghanawaters_db
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_API_PASSWORD=mqtt_api_password
MQTT_ENABLED=true
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=ghanawaters
KEYCLOAK_CLIENT_ID=ghanawaters-api
```

### Development Environment (Kubernetes)
```bash
NODE_ENV=dev
DATABASE_URL=postgresql://snapper_user:xxx@postgres-service.dev.svc.cluster.local:5432/snapper_db
DATABASE_SSL=false
TYPEORM_LOGGING=true
MQTT_BROKER_URL=mqtt://ghanawaters-nanomq:1883
MQTT_API_PASSWORD=<from-secret>
ALLOWED_ORIGINS=https://ghanawaters-dev-admin.ghananautical.info,https://ghanawaters-dev.ghananautical.info
```

### Test Environment (Kubernetes)
```bash
NODE_ENV=test
DATABASE_URL=postgresql://snapper_user:xxx@postgres-service.test.svc.cluster.local:5432/snapper_db
DATABASE_SSL=true
TYPEORM_LOGGING=false
MQTT_BROKER_URL=mqtt://ghanawaters-nanomq:1883
MQTT_API_PASSWORD=<from-secret>
ALLOWED_ORIGINS=https://ghanawaters-test-admin.ghananautical.info,https://ghanawaters-test.ghananautical.info
```

### Production Environment (Kubernetes)
```bash
NODE_ENV=prod
DATABASE_URL=postgresql://snapper_user:xxx@postgres-service.prod.svc.cluster.local:5432/snapper_db
DATABASE_SSL=true
TYPEORM_LOGGING=false
MQTT_BROKER_URL=mqtt://ghanawaters-nanomq:1883
MQTT_API_PASSWORD=<from-secret>
ALLOWED_ORIGINS=https://ghanawaters-admin.ghananautical.info,https://ghanawaters.ghananautical.info
```

## Security Notes

1. **Never commit real passwords** to the repository
2. **Production credentials** are managed through Kubernetes Secrets
3. **Local development** uses `.env.local` with localhost-only credentials
4. **Kubernetes deployments** receive credentials from Secrets, not .env files

## Setting Environment Variables

### Local Development
1. Ensure `.env.local` exists with appropriate values
2. The API will automatically load it when `NODE_ENV` is not set or is `local`

### Kubernetes Deployments
Environment variables are injected from:
1. **ConfigMaps**: For non-sensitive configuration
2. **Secrets**: For passwords and sensitive data
3. **Deployment patches**: For environment-specific overrides

Example Secret creation:
```bash
kubectl create secret generic ghanawaters-postgres-secret \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/db' \
  -n ghanawaters-prod
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` or individual database variables are set correctly
- Check `DATABASE_SSL` setting matches your environment
- Ensure database service is accessible from the pod

### MQTT Connection Issues
- Verify `MQTT_BROKER_URL` is correct
- Check `MQTT_API_PASSWORD` matches NanoMQ configuration
- Ensure NanoMQ service is running and accessible

### Authentication Issues
- Verify Keycloak is accessible at `KEYCLOAK_URL`
- Ensure realm and client ID match Keycloak configuration
- Check that JWKS endpoint is reachable: `{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs`