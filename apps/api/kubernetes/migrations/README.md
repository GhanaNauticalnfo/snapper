# Database Reset for Test Environment

This directory contains Kubernetes jobs for managing database operations in the test environment.

## Quick Usage

### Reset Test Database (Complete Fresh Start)
```bash
kubectl apply -f reset-database.yaml
```

This will:
1. 🗑️ Drop all existing tables and data
2. 🏗️ Run all migrations from scratch  
3. 📊 Insert all test data (vessels, tracking points, etc.)
4. ✅ Leave you with a fresh, clean database

### Monitor the Reset Process
```bash
# Watch job status
kubectl get jobs -n test -w

# View reset logs
kubectl logs -f job/snapper-api-reset-database -n test

# Check if reset completed successfully
kubectl describe job snapper-api-reset-database -n test
```

### Clean Up After Reset
```bash
# Delete the completed job
kubectl delete job snapper-api-reset-database -n test
```

## When to Use Database Reset

✅ **Use reset when:**
- Test environment data is corrupted
- Need to test with fresh data
- Want to verify migrations work from scratch
- Need to clear all test artifacts
- Database schema is out of sync

⚠️ **Warning:** This completely destroys all data in the test database. Use only in test environments.

## Alternative: Regular Migration Job

For normal deployments without reset, use:
```bash
kubectl apply -f run-migrations.yaml
```

## Local Development Reset

For local development environments:
```bash
# Quick reset (drops schema, runs migrations)
npm run db:reset:dev

# Full reset with script (same as Kubernetes)
npm run db:reset:test
```

## Files in this Directory

- `reset-database.yaml` - Complete database reset job for test environment
- `run-migrations.yaml` - Regular migration job template
- `README.md` - This documentation

## Troubleshooting

### Job Failed
```bash
# Check job events
kubectl describe job snapper-api-reset-database -n test

# View detailed logs
kubectl logs job/snapper-api-reset-database -n test
```

### Database Connection Issues
- Verify `snapper-postgres-secret` exists in test namespace
- Check DATABASE_URL is correctly configured
- Ensure PostgreSQL service is running

### Timeout Issues
- Job has 10-minute timeout (`activeDeadlineSeconds: 600`)
- Increase timeout if needed for large databases
- Check PostgreSQL performance and connections