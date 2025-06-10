# Environment Configuration Guide

This document explains how environment configurations work across all Snapper applications (Admin, Frontend, and API).

## Overview

Snapper uses a 3-environment setup:

- **Development**: Local development with proxy to localhost API
- **Test**: Remote test environment using test API server
- **Production**: Remote production environment using production API server

## Environment Structure

### Admin App (`apps/admin/`)

**Files:**
- `src/environments/environment.ts` (Production)
- `src/environments/environment.development.ts` (Development) 
- `src/environments/environment.test.ts` (Test)

**API URLs:**
- **Development**: `/api` → proxied to `http://localhost:3000/api`
- **Test**: `https://snapper-test-api.ghananautical.info/api`
- **Production**: `https://snapper-api.ghananautical.info/api`

### Frontend App (`apps/frontend/`)

**Files:**
- `src/environments/environment.ts` (Production)
- `src/environments/environment.development.ts` (Development)
- `src/environments/environment.test.ts` (Test)

**API URLs:**
- **Development**: `http://localhost:3000/api`
- **Test**: `https://snapper-test-api.ghananautical.info/api`
- **Production**: `https://snapper-api.ghananautical.info/api`

### API App (`apps/api/`)

The API uses environment variables for configuration rather than environment files:

**Environment Variables:**
- `DATABASE_URL` or `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `DATABASE_PORT` (default: 5432)
- `DATABASE_SSL` (default: based on NODE_ENV)
- `TYPEORM_LOGGING` (default: based on NODE_ENV)

## Build Configurations

### Development (Default for serve)

```bash
# Automatically uses development environment
npx nx serve admin &     # Port 4201, uses proxy to localhost:3000
npx nx serve frontend &  # Port 4200, connects to localhost:3000
```

**Configuration:**
- `defaultConfiguration: "development"` in serve target
- Uses development environment files
- Admin uses proxy configuration
- Optimized for development (source maps, no optimization)

### Test Environment

```bash
# Build for test deployment
npx nx build admin --configuration=test
npx nx build frontend --configuration=test
```

**Configuration:**
- Uses test environment files
- Connects to test API server
- Optimized build (minified, no source maps)

### Production Environment

```bash
# Build for production deployment
npx nx build admin --configuration=production
npx nx build frontend --configuration=production
```

**Configuration:**
- Uses production environment files (default)
- Connects to production API server
- Fully optimized build

## Development Workflow

### 1. Start Local Development

```bash
cd snapper

# Start infrastructure
npm run db:up

# Run migrations
npm run migration:run:dev

# Start API (build first to avoid debugger conflicts)
npx nx build api && node dist/apps/api/main.js > api.log 2>&1 &

# Start frontend applications (automatically use development config)
npx nx serve admin > admin.log 2>&1 &
npx nx serve frontend > frontend.log 2>&1 &
```

### 2. Verify Services

```bash
# Check API
curlx -s http://localhost:3000/api/vessels

# Check Admin and Frontend
curlx -s http://localhost:4201 > /dev/null && echo "✅ Admin running"
curlx -s http://localhost:4200 > /dev/null && echo "✅ Frontend running"
```

## Environment File Examples

### Development Environment
```typescript
export const environment = {
  production: false,
  apiUrl: '/api'  // Admin: proxied to localhost:3000
  // OR
  apiUrl: 'http://localhost:3000/api'  // Frontend: direct connection
};
```

### Test Environment
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://snapper-test-api.ghananautical.info/api'
};
```

### Production Environment
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://snapper-api.ghananautical.info/api'
};
```

## Proxy Configuration

### Admin App Proxy (`apps/admin/proxy.conf.json`)
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": true,
    "changeOrigin": true
  }
}
```

The admin app uses a proxy in development to avoid CORS issues when connecting to the local API.

## Troubleshooting

### CORS Errors
- **Development**: Ensure API is running on port 3000 and proxy is configured
- **Test/Production**: CORS should be configured on the API server

### SSL Certificate Errors
- Check that the API URLs are correct for your environment
- For development, use localhost URLs
- For test/production, ensure SSL certificates are valid

### Environment Not Loading
- Verify build configuration in `project.json`
- Check that file replacements are correctly configured
- Ensure environment files exist and have correct syntax

### Wrong API URL
- Check which environment configuration is being used
- Verify the build/serve command uses the correct `--configuration` flag
- For development, ensure you're not specifying `--configuration=production`

## Port Reference

| Application | Development Port | Claude Code Testing Port |
|-------------|------------------|--------------------------|
| API         | 3000            | 3000                    |
| Admin       | 4201            | 4203                    |
| Frontend    | 4200            | 4202                    |
| PostgreSQL  | 5432            | 5432                    |
| Artemis     | 8161/1883       | 8161/1883               |

## API Environment Variables

For API deployment, set these environment variables:

### Development
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=snapper_user
DATABASE_PASSWORD=snapper_password
DATABASE_NAME=snapper_db
DATABASE_SSL=false
TYPEORM_LOGGING=true
```

### Test
```bash
DATABASE_URL=postgresql://user:pass@test-db-host:5432/snapper_test
DATABASE_SSL=true
TYPEORM_LOGGING=false
```

### Production
```bash
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/snapper_prod
DATABASE_SSL=true
TYPEORM_LOGGING=false
```