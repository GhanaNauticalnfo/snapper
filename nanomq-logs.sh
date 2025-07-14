#!/bin/bash
# Script to view NanoMQ debug logs

echo "=== NanoMQ Debug Logs ==="
docker compose -f docker/local/docker-compose.yml logs nanomq --tail ${1:-50}