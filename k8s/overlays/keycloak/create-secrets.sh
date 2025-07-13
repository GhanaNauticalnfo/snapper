#!/bin/bash

# Create namespace if it doesn't exist
kubectl create namespace ghanawaters-keycloak --dry-run=client -o yaml | kubectl apply -f -

# Create Keycloak admin credentials
kubectl create secret generic keycloak-admin-secret \
  --from-literal=KEYCLOAK_ADMIN=admin \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD='NplmjCW6jTOdzBTtftmLggd9vkmZl6zZx8Q6t7l2MVE=' \
  -n ghanawaters-keycloak \
  --dry-run=client -o yaml | kubectl apply -f -

# Create PostgreSQL credentials for Keycloak
kubectl create secret generic keycloak-postgres-secret \
  --from-literal=POSTGRES_USER=keycloak \
  --from-literal=POSTGRES_PASSWORD='ktaK3YgIvLIW3EOVolPzw0E+OLdv6pDk8SpqqUkm8Pc=' \
  --from-literal=POSTGRES_DB=keycloak \
  -n ghanawaters-keycloak \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets created successfully!"
echo ""
echo "Keycloak Admin Credentials:"
echo "Username: admin"
echo "Password: NplmjCW6jTOdzBTtftmLggd9vkmZl6zZx8Q6t7l2MVE="
echo ""
echo "PostgreSQL Credentials:"
echo "Username: keycloak"
echo "Password: ktaK3YgIvLIW3EOVolPzw0E+OLdv6pDk8SpqqUkm8Pc="