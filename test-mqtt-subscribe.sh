#!/bin/bash
# Test MQTT subscription using mosquitto_sub

echo "Subscribing to /sync topic..."
mosquitto_sub -h localhost -p 1883 -u api -P mqtt_api_password -t /sync -v