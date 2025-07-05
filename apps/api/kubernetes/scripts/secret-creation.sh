#!/bin/bash
# This script creates or updates Kubernetes secrets for PostgreSQL in test and prod environments

# Set your environment (test or prod)
ENVIRONMENT=$1

if [ "$ENVIRONMENT" != "test" ] && [ "$ENVIRONMENT" != "prod" ]; then
  echo "Usage: $0 [test|prod]"
  echo "Note: This will create the secret in namespace ghanawaters-$ENVIRONMENT"
  exit 1
fi

# Generate secure random password using OpenSSL (24 characters)
POSTGRES_PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 24)

# Set database configuration
POSTGRES_USER="ghanawaters_user"
POSTGRES_DB="ghanawaters_db"
# Notice that the host is the k8s service name for this environment
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@ghanawaters-postgres-service:5432/${POSTGRES_DB}"

# Create the secret manifest and apply it (this will update if it exists)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ghanawaters-postgres-secret
  namespace: ghanawaters-$ENVIRONMENT
type: Opaque
stringData:
  POSTGRES_USER: "${POSTGRES_USER}"
  POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
  POSTGRES_DB: "${POSTGRES_DB}"
  DATABASE_URL: "${DATABASE_URL}"
EOF

echo "PostgreSQL secret created/updated in ghanawaters-$ENVIRONMENT namespace"
echo ""
echo "Save these credentials in a secure location:"
echo "--------------------------------------------"
echo "Database User: $POSTGRES_USER"
echo "Database Password: $POSTGRES_PASSWORD"
echo "Database Name: $POSTGRES_DB"
echo "Connection URL: $DATABASE_URL"