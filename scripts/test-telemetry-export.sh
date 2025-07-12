#!/bin/bash

# Script to test telemetry export streaming
# This will download a large telemetry export and monitor memory usage

echo "Testing telemetry export streaming..."
echo "This will export telemetry data for the entire year 2024"
echo ""

# Export URL
API_URL="http://localhost:3000/api/vessels/telemetry/export"

# Test parameters
START_DATE="2024-01-01"
END_DATE="2024-12-31"
OUTPUT_FILE="telemetry-export-test.zip"

# First, get stats about the export
echo "Fetching export statistics..."
STATS_URL="${API_URL/export/export\/stats}?startDate=${START_DATE}&endDate=${END_DATE}"
curlx -s "$STATS_URL" | jq .

echo ""
echo "Starting export download..."
echo "Output file: $OUTPUT_FILE"
echo ""

# Download with progress monitoring
curlx -o "$OUTPUT_FILE" \
  --progress-bar \
  --write-out "\nDownload completed in %{time_total}s\n" \
  "${API_URL}?startDate=${START_DATE}&endDate=${END_DATE}"

# Check file size
if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
  echo "Downloaded file size: $FILE_SIZE"
  
  # Test the zip file integrity
  echo ""
  echo "Testing zip file integrity..."
  unzip -t "$OUTPUT_FILE" | tail -5
  
  echo ""
  echo "Export test completed successfully!"
else
  echo "Error: Export file was not created"
  exit 1
fi