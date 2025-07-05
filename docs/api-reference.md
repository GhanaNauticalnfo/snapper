# API Reference

## Sync Endpoint

### Get Changes Since Timestamp

Retrieves all data changes since the specified timestamp.

**Endpoint:** `GET /api/data/sync`

**Query Parameters:**
- `since` (optional) - ISO 8601 timestamp. Returns all changes after this time. If omitted, returns all current data.

**Headers:**
- `Authorization: Bearer {token}` - Required for authenticated sync

**Response:**
```json
{
  "version": "2025-01-28T12:00:00.000Z",
  "data": [
    {
      "entity_type": "route",
      "entity_id": "123",
      "action": "create",
      "data": {
        "type": "Feature",
        "id": 123,
        "geometry": {
          "type": "LineString",
          "coordinates": [[-0.1975, 5.5509], [-0.1875, 5.5609]]
        },
        "properties": {
          "id": 123,
          "name": "Accra to Tema Route",
          "description": "Main shipping lane",
          "color": "#0000FF",
          "enabled": true,
          "created": "2025-01-28T10:00:00.000Z",
          "last_updated": "2025-01-28T10:00:00.000Z"
        }
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid timestamp format
- `401 Unauthorized` - Missing or invalid Bearer token

## Routes API

### List All Routes
`GET /api/routes`

### Get Enabled Routes Only
`GET /api/routes/enabled`

### Get Single Route
`GET /api/routes/{id}`

### Create Route
`POST /api/routes`

**Request Body:**
```json
{
  "name": "Accra to Tema",
  "description": "Main shipping route",
  "waypoints": [
    {"lat": 5.5509, "lng": -0.1975, "order": 1},
    {"lat": 5.5609, "lng": -0.1875, "order": 2}
  ],
  "color": "#0000FF",
  "enabled": true
}
```

### Update Route
`PUT /api/routes/{id}`

### Delete Route
`DELETE /api/routes/{id}`

## GeoJSON Format

All map features are returned as GeoJSON for easy integration with mapping libraries:

### Route GeoJSON
```json
{
  "type": "Feature",
  "id": 123,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-0.1975, 5.5509],
      [-0.1875, 5.5609],
      [-0.1775, 5.5709]
    ]
  },
  "properties": {
    "name": "Navigation Route",
    "color": "#0000FF",
    "enabled": true
  }
}
```

### Marker GeoJSON
```json
{
  "type": "Feature",
  "id": 456,
  "geometry": {
    "type": "Point",
    "coordinates": [-0.0175, 5.5209]
  },
  "properties": {
    "name": "Harbor Entrance",
    "icon": "harbor",
    "color": "#00FF00",
    "enabled": true
  }
}
```

### Hazard GeoJSON
```json
{
  "type": "Feature",
  "id": 789,
  "geometry": {
    "type": "Point",
    "coordinates": [-0.0375, 5.5409]
  },
  "properties": {
    "name": "Shallow Water",
    "radius": 500,
    "type": "danger",
    "color": "#FF0000",
    "enabled": true
  }
}
```