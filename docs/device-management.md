# Device Management System

## Overview

The device management system enables (Android) devices to securely report vessel positions to the Snapper API. Each vessel can have at most **one active device** and **one pending device** at any time.

## Key Concepts

### Device States

1. **Pending**: A device has been created but not yet activated
   - Has an activation token for one-time setup
   - Expires after a configurable period (default: 3 days)
   - Cannot report vessel positions
   - Can be deleted completely from the system

2. **Active**: Device has been activated and can report positions
   - Has an auth token for API authentication
   - Can report vessel positions via the tracking API
   - Cannot be deleted directly, only retired. (Except if the full vessel is deleted)

3. **Retired**: Device has been deactivated but preserved for history
   - Cannot report vessel positions (auth token is cleared)
   - Preserved in database for audit trail
   - Created when an active device is "deleted" via admin UI

### Device Constraints

- **Maximum 1 active device per vessel**: Ensures only one device can report positions
- **Maximum 1 pending device per vessel**: Prevents accidental creation of multiple unused devices
- **Unlimited retired devices per vessel**: Maintains audit trail of all devices
- **Activation tokens expire**: Enhances security by limiting the activation window

## Backend Implementation

### Database Schema

The `devices` table contains:
```sql
- device_id (UUID, primary key)
- device_token (unique identifier)
- activation_token (one-time activation token)
- auth_token (bearer token for API calls, null until activated, cleared when retired)
- is_activated (boolean, legacy field)
- state (enum: 'pending', 'active', 'retired')
- activated_at (timestamp)
- expires_at (timestamp)
- vessel_id (foreign key to vessels)
- created_at, updated_at (timestamps)
```

### API Endpoints

#### Device Management
- `GET /api/devices` - List all devices with filtering options
  - Query params: `vessel_id`, `include_retired`, `include_expired`
- `GET /api/devices/:id` - Get specific device details
- `POST /api/devices` - Create new device with activation token
- `DELETE /api/devices/:id` - Delete or retire device
  - Active devices: Automatically retired (preserved in database)
  - Pending/Retired devices: Deleted completely

#### Device Activation
- `POST /api/devices/activate` - Exchange activation token for auth credentials
  - Input: `{ "activation_token": "xxx" }`
  - Output: `{ "auth_token": "xxx", "device_token": "xxx", "device_id": "xxx", "vessel": "name" }`

#### Position Reporting
- `POST /api/vessels/telemetry/report` - Report vessel position (requires device auth)
  - Protected by `DeviceAuthGuard`
  - Requires `Authorization: Bearer <auth_token>` header
  - Device ID and vessel ID are automatically determined from the authenticated device

### Services

#### DeviceAuthService (`device-auth.service.ts`)
Key methods:
- `createDevice(vesselId, expiresInDays)` - Creates device with constraint validation
- `activateDevice(activationToken)` - Exchanges activation token for auth token, sets state to 'active'
- `validateDevice(authToken)` - Validates device for API requests (only active devices)
- `deleteDevice(deviceId)` - Deletes or retires device based on state:
  - Active devices → Retired (state changed, auth token cleared)
  - Pending/Retired devices → Deleted from database
- `getDevicesByVessel(vesselId)` - Returns devices grouped by status: {active, pending, retired}

## Frontend Implementation

### Admin Dashboard

The vessel device management UI is located in the vessel details dialog under the "Device" tab.

#### UI Structure
```
Devices
├── [Add Device] button (disabled if pending device exists)
├── Active Device Section
│   ├── Status: Active
│   ├── Device ID: xxx
│   ├── Activated: timestamp
│   └── [Delete] button
└── Pending Device Section
    ├── Status: Pending Activation
    ├── Device ID: xxx
    ├── Expires: timestamp
    ├── Activation Link: [input] [Copy] [Open]
    ├── [Regenerate] button
    └── [Delete] button
```

#### Key Components

**Computed Signals** (in `vessel-list.component.ts`):
- `activeDevice()` - Returns the active device or null
- `pendingDevice()` - Returns the pending device or null
- `hasPendingDevice()` - Boolean for button state management

**Device Actions**:
- Create: Calls `POST /api/devices` with 3-day expiration
- Delete: Calls `DELETE /api/devices/:id` for both cases:
  - Pending devices: Deleted completely from database
  - Active devices: Automatically retired (preserved in database)

**UI Filtering**:
- By default, retired devices are filtered out of the admin UI
- Only active and pending devices are shown in the vessel device management tab
- This provides a clean interface while preserving audit history

## Android App Integration

### Activation Flow

1. **URL Scheme**: `ghanawaters://auth?token=ACTIVATION_TOKEN`
2. **TokenAuthActivity** handles the URL and exchanges token
3. **Stored Credentials** (encrypted SharedPreferences):
   - `auth_token` - For API authentication
   - `device_token` - Device identifier
   - `device_id` - Device UUID
   - `vessel_name` - Associated vessel name

### Position Reporting

The Android app uses the auth token to report positions:
```kotlin
// HTTP Header
Authorization: Bearer <auth_token>

// Endpoint
POST /api/vessels/telemetry/report
{
  "position": {
    "type": "Point",
    "coordinates": [-1.234, 5.123]  // [longitude, latitude]
  },
  "timestamp": "2024-01-01T12:00:00Z",  // ISO 8601 format
  "speed_knots": 10.5,  // Speed in knots
  "heading_degrees": 180  // Heading in degrees (0-360)
}
```

**Note**: The device_id and vessel_id are automatically determined from the Bearer token authentication. No need to include them in the request payload.

## Workflow Examples

### Creating and Activating a Device

1. **Admin creates device**:
   ```bash
   POST /api/devices
   { "vessel_id": 123, "expires_in_days": 3 }
   ```

2. **Admin shares activation URL**:
   - Direct link: `http://192.168.1.x:4200/activate?token=XXX`
   - App scheme: `ghanawaters://auth?token=XXX`

3. **User activates on mobile**:
   - Clicks activation link
   - Android app opens and exchanges token
   - Device becomes active

4. **Device reports positions**:
   - Uses stored auth token
   - Reports via `/api/tracking/report`

### Handling Device Issues

**Lost/Stolen Device**:
1. Delete the active device via admin UI (it will be automatically retired, preserving history)
2. Create a new pending device
3. Activate on new mobile device

**Expired Pending Device**:
1. Delete the expired device
2. Create new pending device with fresh token

**Multiple Devices Needed** (not supported):
- System enforces single device per vessel
- For fleet management, create separate vessels

## Security Considerations

1. **Token Security**:
   - Activation tokens are one-time use only
   - Auth tokens should be transmitted over HTTPS
   - Tokens are stored in encrypted SharedPreferences on Android

2. **Expiration**:
   - Pending devices expire after 3 days by default
   - Expired tokens cannot be activated
   - No automatic auth token expiration (manual revocation required)

3. **Access Control**:
   - Device can only report positions for its assigned vessel
   - Admin UI requires authentication to manage devices
   - API validates device ownership on each request

## Error Handling

Common error responses:

- **400 Bad Request**: 
  - "Vessel already has a pending device"
- **404 Not Found**: 
  - "Invalid activation token"
  - "Device not found"
- **410 Gone**: "Token already activated" or "Activation token expired"
- **401 Unauthorized**: "Invalid device token"

## Future Enhancements

Potential improvements to consider:

1. **Push Notifications**: Notify when device activated
2. **Device Metadata**: Store device model, OS version
3. **Activity Logs**: Track activation attempts and position reports
4. **Automatic Cleanup**: Remove expired devices via scheduled job
5. **Multi-Device Support**: Allow multiple active devices with role-based access