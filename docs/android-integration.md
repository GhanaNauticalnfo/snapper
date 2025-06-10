# Android App Integration with Snapper API

## Overview
This document describes the integration between the Android tracking app and the Snapper API.

## Authentication Flow

### 1. Device Token Creation (Admin)
- Admin creates a device token via the API or admin UI
- Optionally assigns a vessel to the device
- Sets expiration period (default 30 days)
- Receives an activation URL: `ghmaritimeapp://auth?token={activation_token}`

### 2. Device Activation (Android App)
- User clicks/scans the activation URL
- Android app intercepts the URL and extracts the token
- App sends POST to `/api/devices/activate` with the activation token
- Server validates token and returns:
  - `auth_token`: Permanent authentication token
  - `device_token`: Unique device identifier
  - `device_id`: UUID for the device
  - `vessel`: Optional vessel name

### 3. Position Reporting (Android App)
- App sends POST to `/api/vessels/telemetry/report` with Bearer token
- Includes position data:
  - `device_token`: Device identifier
  - `latitude`, `longitude`: GPS coordinates
  - `accuracy`, `speed`, `bearing`, `altitude`: GPS metrics
  - `timestamp`: Unix timestamp
  - `provider`: GPS provider name
  - `vessel`: Optional vessel name

## API Endpoints

### Device Management (Admin)
- `GET /api/device-tokens` - List all device tokens
- `GET /api/device-tokens/:id` - Get specific device token
- `POST /api/device-tokens` - Create new device token
- `DELETE /api/device-tokens/:id` - Delete device token
- `POST /api/device-tokens/:id/revoke` - Revoke activated device

### Tracking (Android)
- `POST /api/devices/activate` - Activate device with token
- `POST /api/vessels/telemetry/report` - Report position (requires auth)

## Database Schema

### device_tokens table
- `device_id` (UUID): Primary key
- `device_token`: Unique device identifier
- `activation_token`: One-time activation token
- `auth_token`: Bearer token for API access
- `is_activated`: Activation status
- `activated_at`: Activation timestamp
- `expires_at`: Token expiration
- `vessel_id`: Optional vessel assignment

## Security Considerations
- Activation tokens are one-time use only
- Auth tokens stored encrypted on Android device
- HTTPS required for all API communications
- Tokens can be revoked by admin

## Future Enhancements
- MQTT support for real-time tracking
- Batch position reporting
- Offline position buffering
- Device management in admin UI