#!/bin/bash
# Helper script to run migrations manually

# Get command line arguments
ENVIRONMENT=$1
BRANCH=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$BRANCH" ]; then
  echo "Usage: $0 [test|prod] [branch-name]"
  echo "Example: $0 test develop"
  echo "Example: $0 prod main"
  exit 1
fi

# Verify environment is valid
if [ "$ENVIRONMENT" != "test" ] && [ "$ENVIRONMENT" != "prod" ]; then
  echo "Error: Environment must be 'test' or 'prod'"
  exit 1
fi

# Create timestamp for unique job name
TIMESTAMP=$(date +%s)

# Create the migration job by replacing placeholders
cat migrations/run-migrations.yaml | \
  sed "s/{TIMESTAMP}/$TIMESTAMP/g" | \
  sed "s/{ENVIRONMENT}/$ENVIRONMENT/g" | \
  sed "s/{BRANCH}/$BRANCH/g" | \
  kubectl apply -f -

echo "Migration job created: snapper-api-migrations-$TIMESTAMP"
echo "Waiting for job to complete..."

# Wait for job to complete
kubectl wait --for=condition=complete job/snapper-api-migrations-$TIMESTAMP --namespace $ENVIRONMENT --timeout=300s

if [ $? -eq 0 ]; then
  echo "Migration completed successfully"
  
  # Show logs
  POD_NAME=$(kubectl get pods -n $ENVIRONMENT -l job-name=snapper-api-migrations-$TIMESTAMP -o jsonpath="{.items[0].metadata.name}")
  echo "Migration logs:"
  kubectl logs $POD_NAME -n $ENVIRONMENT
  
  # Cleanup
  echo "Cleaning up job..."
  kubectl delete job snapper-api-migrations-$TIMESTAMP -n $ENVIRONMENT
  
  echo "Done!"
else
  echo "Migration failed or timed out"
  
  # Show logs for debugging
  POD_NAME=$(kubectl get pods -n $ENVIRONMENT -l job-name=snapper-api-migrations-$TIMESTAMP -o jsonpath="{.items[0].metadata.name}")
  echo "Migration logs:"
  kubectl logs $POD_NAME -n $ENVIRONMENT
  
  # Don't clean up so the logs remain available
  echo "Job left for debugging. Clean up with: kubectl delete job snapper-api-migrations-$TIMESTAMP -n $ENVIRONMENT"
  
  exit 1
fi