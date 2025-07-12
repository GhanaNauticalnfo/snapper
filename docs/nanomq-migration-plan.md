# NanoMQ Migration Plan - Replace Apache Artemis

## Overview
This document outlines the plan to replace Apache Artemis with NanoMQ as the MQTT broker for Ghana Waters. The migration will be done in phases, starting with local development and testing before moving to Kubernetes.

## Current State
- **MQTT Broker**: Apache Artemis running in Docker
- **Authentication**: Basic username/password (artemis/artemis_password)
- **Topics**: 
  - API subscribes to: `vessels/+/track`
  - Simulator publishes to: `vessels/{id}/position`
- **Clients**: 
  - API using MqttTrackingService
  - Vessel simulator (for testing)
  - Android app (future integration)

## Target State
- **MQTT Broker**: NanoMQ with SQLite persistence
- **Authentication**: HTTP webhook using device tokens
- **Authorization**: Static ACL rules in configuration
- **Topics**:
  - Vessel telemetry: `vessels/{id}/position`
  - Sync broadcasts: `/sync`
- **Security**: Device-specific topic isolation

## Phase 1: Local Development Environment

### 1.1 Docker Compose Changes

#### Remove Artemis Service
Remove the entire Artemis service block from `docker/local/docker-compose.yml`.

#### Add NanoMQ Service
```yaml
nanomq:
  image: emqx/nanomq:latest-sqlite
  container_name: ghanawaters-nanomq
  ports:
    - "1883:1883"  # MQTT (for local dev)
    - "8883:8883"  # MQTTS (for production-like testing)
  volumes:
    - ./nanomq/nanomq.conf:/etc/nanomq/nanomq.conf
    - nanomq-data:/data/db/
  restart: unless-stopped
  networks:
    - ghanawaters-network
  healthcheck:
    test: ["CMD", "nc", "-z", "localhost", "1883"]
    interval: 10s
    timeout: 5s
    retries: 3

volumes:
  nanomq-data:
    driver: local
```

### 1.2 NanoMQ Configuration

Create `docker/local/nanomq/nanomq.conf`:
```hocon
# Basic broker settings
broker {
  property_size = 32
  max_packet_size = 10MB
  client_max_packet_size = 5MB
  msq_len = 2048
  rate_limit = "1000,10s"
  conn_rate_limit = "500/s"
  max_conn_rate = 500
  keepalive_multiplier = 1.25
}

# Listeners
listeners.tcp {
  bind = "0.0.0.0:1883"
  acceptors = 4
  max_connections = 1024000
}

# For future TLS testing
listeners.tls {
  bind = "0.0.0.0:8883"
  acceptors = 4
  max_connections = 1024000
  ssl_options {
    certfile = "/etc/tls/tls.crt"
    keyfile = "/etc/tls/tls.key"
    verify = verify_none  # For dev only
  }
}

# HTTP webhook authentication
auth {
  type = http
  auth_req {
    url = "http://ghanawaters-api:3000/mqtt/auth"
    method = POST
    headers {
      content-type = "application/x-www-form-urlencoded"
    }
    params = {
      clientid = "%c"
      username = "%u"
      password = "%P"
    }
    timeout = 5s
  }
}

# Static ACL rules
authorization {
  deny_action = disconnect
  no_match = deny
  sources = [
    {
      type = simple
      rules = [
        # API user can publish to /sync and subscribe to all vessel positions
        { permit = allow, username = "api", action = publish, topics = ["/sync"] }
        { permit = allow, username = "api", action = subscribe, topics = ["vessels/+/position"] }
        
        # Vessels can subscribe to /sync and publish to their own position topic
        { permit = allow, username = "#", action = subscribe, topics = ["/sync"] }
        { permit = allow, username = "#", action = publish, topics = ["vessels/%u/position"] }
      ]
    }
  ]
}

# SQLite persistence
sqlite {
  enable = true
  disk_cache_size = 102400
  mounted_file_path = "/data/db/"
  flush_mem_threshold = 100
  resend_interval = 5000
}

# Logging
log {
  to = console
  level = info
  dir = "/var/log/nanomq"
  file = "nanomq.log"
  rotation {
    size = "10MB"
    count = 5
  }
}

# Disable anonymous access
allow_anonymous = false
```

### 1.3 API Changes

#### Create MQTT Auth Controller
Create `apps/api/src/app/vessels/mqtt/mqtt-auth.controller.ts`:
```typescript
@Controller('mqtt')
export class MqttAuthController {
  constructor(private deviceAuthService: DeviceAuthService) {}

  @Post('auth')
  async authenticate(
    @Body('clientid') clientId: string,
    @Body('username') username: string,
    @Body('password') password: string,
  ): Promise<void> {
    // Special case for API user
    if (username === 'api') {
      if (password === process.env.MQTT_API_PASSWORD) {
        return; // 200 OK
      }
      throw new UnauthorizedException();
    }

    // For vessels: username should be vessel ID, password is device token
    try {
      const device = await this.deviceAuthService.validateDevice(password);
      
      // Verify device belongs to the vessel ID in username
      if (device.vessel_id?.toString() !== username) {
        throw new UnauthorizedException();
      }
      
      return; // 200 OK
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
```

#### Update MQTT Tracking Service
Modify `apps/api/src/app/vessels/tracking/mqtt-tracking.service.ts`:
- Change connection to use "api" username
- Update topic subscription from `vessels/+/track` to `vessels/+/position`
- Add ability to publish to `/sync` topic

#### Environment Variables
Add to `.env`:
```
MQTT_API_PASSWORD=secure_api_password_for_mqtt
MQTT_BROKER_URL=mqtt://localhost:1883
```

### 1.4 Testing Plan

#### Test 1: Basic Connectivity
1. Start NanoMQ with docker-compose
2. Verify health check passes
3. Check logs for startup errors

#### Test 2: API Authentication
1. Start API with MQTT auth endpoint
2. Test auth endpoint with curl:
   ```bash
   # Test API user
   curl -X POST http://localhost:3000/mqtt/auth \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "clientid=api-client&username=api&password=secure_api_password_for_mqtt"
   
   # Test vessel with valid device token
   curl -X POST http://localhost:3000/mqtt/auth \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "clientid=vessel-1&username=1&password=<device_token>"
   ```

#### Test 3: Vessel Simulator
1. Update vessel simulator to use device authentication
2. Create test device via API
3. Run simulator with device token
4. Verify position updates received by API

#### Test 4: ACL Rules
1. Test API can subscribe to vessel positions
2. Test API can publish to /sync
3. Test vessel can only publish to its own topic
4. Test vessel cannot publish to other vessel topics

#### Test 5: Persistence
1. Send messages with QoS 1
2. Restart NanoMQ
3. Verify messages delivered after restart

### 1.5 Android App Testing (Local)

#### Update Android Configuration
1. Point to local API endpoint
2. Use device token for MQTT authentication
3. Subscribe to `/sync` topic
4. Publish to `vessels/{vessel_id}/position`

#### Test Scenarios
1. Device activation flow
2. MQTT connection with device token
3. Position reporting
4. Sync message reception
5. Connection recovery

## Phase 2: Kubernetes Deployment

### 2.1 Create Kubernetes Resources

#### StatefulSet for NanoMQ
- Single replica with PVC for persistence
- ConfigMap for configuration
- Secret for TLS certificates
- Resource limits appropriate for 1000 devices

#### Service Configuration
- ClusterIP service for internal access
- Port 8883 for MQTTS

#### Ingress Configuration
- IngressRouteTCP for Traefik or
- NGINX tcp-services ConfigMap
- TLS passthrough or termination

### 2.2 Environment-Specific Configuration

#### Test Environment
- Lower resource limits
- Debug logging enabled
- Relaxed rate limits

#### Production Environment
- Higher resource limits
- Info logging level
- Strict rate limits
- Monitoring integration

## Phase 3: Migration Steps

### 3.1 Pre-Migration
1. Document current Artemis configuration
2. Export any persistent data if needed
3. Update documentation
4. Prepare rollback plan

### 3.2 Migration Execution
1. Deploy NanoMQ alongside Artemis
2. Update API to connect to NanoMQ
3. Test with subset of devices
4. Gradually migrate all devices
5. Decommission Artemis

### 3.3 Post-Migration
1. Monitor performance metrics
2. Verify all devices connected
3. Check message delivery rates
4. Update monitoring dashboards

## Success Criteria

1. **Authentication**: All devices authenticate successfully with tokens
2. **Authorization**: ACL rules prevent unauthorized topic access
3. **Performance**: Handle 1000+ concurrent connections
4. **Reliability**: Messages delivered with QoS guarantees
5. **Persistence**: Sessions survive broker restarts

## Rollback Plan

If issues arise during migration:
1. Keep Artemis configuration and data
2. Update API to reconnect to Artemis
3. Revert Android app configuration
4. Document issues for resolution

## Timeline

- **Week 1**: Local development and testing
- **Week 2**: Kubernetes deployment to test environment
- **Week 3**: Production deployment preparation
- **Week 4**: Production migration and monitoring

## References

- [NanoMQ Documentation](https://nanomq.io/docs/en/latest/)
- [NanoMQ HTTP Auth](https://nanomq.io/docs/en/latest/access-control/http-auth.html)
- [NanoMQ ACL Configuration](https://nanomq.io/docs/en/latest/access-control/acl.html)