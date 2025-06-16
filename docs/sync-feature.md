# Sync Feature Documentation

## Overview

The Sync Feature provides offline-first data synchronization between the Snapper API and Android client applications. It enables maritime navigation apps to work reliably in areas with poor or no connectivity by caching map data locally and syncing changes when online.

## Architecture

### How It Works

1. **Server Side**: 
   - Maintains a `sync_log` table that tracks all changes (create/update/delete) to synced entities
   - When data changes, marks old entries as `is_latest=false` and inserts new entry with `is_latest=true`
   - Provides single endpoint `/api/data/sync?since=timestamp` that returns only latest changes after given timestamp

2. **Client Side**:
   - Stores last sync timestamp and all map features locally in SQLite/Room database
   - On app launch (or periodically), calls sync endpoint with last timestamp
   - Receives only changes since last sync - applies creates/updates/deletes to local database
   - Updates map display from local database - works offline with cached data

### Key Benefits

- **Minimal data transfer** - only sends what changed
- **No duplicate updates** - server tracks "latest" state per entity
- **Simple conflict resolution** - server's latest version always wins
- **Offline-first** - app works without connection using local data

## Server Implementation (NestJS)

### Database Schema

```sql
-- Sync log table
CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50),      -- entity type name (e.g. 'route')
  entity_id VARCHAR(100),
  action VARCHAR(20),           -- 'create', 'update', 'delete'
  data JSONB,                   -- GeoJSON feature (null for deletes)
  created_at TIMESTAMP DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT true
);

CREATE INDEX idx_sync_latest ON sync_log(created_at, is_latest) 
WHERE is_latest = true;
```

### API Endpoint

**GET** `/api/data/sync?since={timestamp}`

Query Parameters:
- `since` (optional) - ISO 8601 timestamp. If omitted, returns all current data.

Response:
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
        "geometry": {
          "type": "LineString",
          "coordinates": [[lng, lat], ...]
        },
        "properties": {
          "name": "Navigation Route",
          "color": "#FF0000",
          ...
        }
      }
    }
  ]
}
```

### Integration with Services

To enable sync for any entity, inject `SyncService` and call `logChange`:

```typescript
// In your service
constructor(
  private syncService: SyncService
) {}

async createRoute(data: CreateRouteDto): Promise<Route> {
  const route = await this.routeRepository.save(data);
  
  // Log to sync
  await this.syncService.logChange(
    'route',                           // entity_type
    route.id.toString(),              // entity_id
    'create',                         // action
    this.convertToGeoJson(route)      // GeoJSON data
  );
  
  return route;
}
```

## Android Client Implementation

### Dependencies

Add to `app/build.gradle.kts`:
```kotlin
dependencies {
    // Room database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    
    // Retrofit for API
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    
    // WorkManager for background sync
    implementation("androidx.work:work-runtime-ktx:2.9.0")
}
```

### Data Models

```kotlin
// Local storage entities
@Entity(tableName = "features")
data class Feature(
    @PrimaryKey val id: String,
    val type: String,           // "route", "marker", "hazard"
    val geoJson: String,        // Stored as JSON string
    val updatedAt: String
)

@Entity(tableName = "sync_meta")
data class SyncMeta(
    @PrimaryKey val key: String = "last_sync",
    val version: String         // Last sync timestamp
)
```

### Sync Manager Usage

```kotlin
class MapActivity : AppCompatActivity() {
    private lateinit var syncManager: SyncManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize sync manager
        syncManager = SyncManager(
            context = this,
            apiEndpoint = "https://api.example.com/"
        )
        
        // Sync on startup
        lifecycleScope.launch {
            if (isOnline()) {
                val success = syncManager.sync()
                if (success) {
                    updateMapFromLocalData()
                }
            }
        }
        
        // Schedule periodic sync
        scheduleDailySync(this)
    }
    
    private suspend fun updateMapFromLocalData() {
        // Get GeoJSON from local database
        val routes = syncManager.getFeatureCollection("route")
        val markers = syncManager.getFeatureCollection("marker")
        val hazards = syncManager.getFeatureCollection("hazard")
        
        // Update map sources
        routes?.let { 
            mapStyle.getSourceAs<GeoJsonSource>("routes")?.setGeoJson(it) 
        }
        // ... etc
    }
}
```

### Background Sync

The sync worker runs daily when conditions are met:

```kotlin
fun scheduleDailySync(context: Context) {
    val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
        1, TimeUnit.DAYS
    )
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()
    )
    .build()
    
    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
            "sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
}
```

## Adding New Entity Types

To add a new entity type (e.g., "anchorage"):

### 1. Server Side

Create entity and service:
```typescript
// anchorage.entity.ts
@Entity('anchorages')
export class Anchorage {
  @PrimaryKey() id: number;
  @Column() name: string;
  @Column({ type: 'float' }) lat: number;
  @Column({ type: 'float' }) lng: number;
  // ... other fields
}

// anchorage.service.ts
@Injectable()
export class AnchorageService {
  constructor(
    @InjectRepository(Anchorage) 
    private repo: Repository<Anchorage>,
    private syncService: SyncService
  ) {}
  
  async create(data: CreateAnchorageDto): Promise<Anchorage> {
    const anchorage = await this.repo.save(data);
    
    // Log to sync
    await this.syncService.logChange(
      'anchorage',
      anchorage.id.toString(),
      'create',
      this.convertToGeoJson(anchorage)
    );
    
    return anchorage;
  }
  
  private convertToGeoJson(anchorage: Anchorage): any {
    return {
      type: 'Feature',
      id: anchorage.id,
      geometry: {
        type: 'Point',
        coordinates: [anchorage.lng, anchorage.lat]
      },
      properties: {
        name: anchorage.name,
        // ... other properties
      }
    };
  }
}
```

### 2. Client Side

Update the map to handle the new type:
```kotlin
// In MapScreen.kt
private fun setupMapLayers(style: Style) {
    // ... existing layers ...
    
    // Add anchorage layer
    style.addSource(GeoJsonSource("anchorages", "{}"))
    
    val anchorageLayer = SymbolLayer("anchorage-layer", "anchorages")
    anchorageLayer.setProperties(
        PropertyFactory.iconImage("anchorage-icon"),
        PropertyFactory.iconSize(1.5f)
    )
    style.addLayer(anchorageLayer)
}

// In sync update
syncManager.getFeatureCollection("anchorage")?.let { 
    style.getSourceAs<GeoJsonSource>("anchorages")?.setGeoJson(it) 
}
```

## Testing

### Server Tests
```bash
# Run sync-specific tests
cd snapper
npx nx test api --testPathPattern=sync

# Run E2E tests
npx nx e2e api-e2e --testPathPattern=sync
```

### Android Tests
```bash
cd AndroidApp
# Unit tests
./gradlew testDebugUnitTest

# Instrumented tests (requires device/emulator)
./gradlew connectedAndroidTest
```

## Monitoring & Debugging

### Server Side

Check sync log status:
```sql
-- View recent sync entries
SELECT * FROM sync_log 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check entity sync history
SELECT * FROM sync_log 
WHERE entity_id = '123' 
ORDER BY created_at DESC;

-- Verify latest flags
SELECT entity_id, COUNT(*) as versions,
       SUM(CASE WHEN is_latest THEN 1 ELSE 0 END) as latest_count
FROM sync_log
GROUP BY entity_id
HAVING SUM(CASE WHEN is_latest THEN 1 ELSE 0 END) != 1;
```

### Client Side

Enable sync logging:
```kotlin
// In SyncManager
Log.d("SyncManager", "Syncing since: $currentVersion")
Log.d("SyncManager", "Received ${response.data.size} changes")
Log.d("SyncManager", "Sync completed. New version: ${response.version}")
```

Check local database:
```kotlin
// Debug helper to view local data
suspend fun debugLocalData() {
    val features = database.featureDao().getAll()
    features.forEach { feature ->
        Log.d("LocalData", "${feature.type}:${feature.id} - ${feature.updatedAt}")
    }
}
```

## Performance Considerations

1. **Index Usage**: The `idx_sync_latest` index ensures fast queries for sync data
2. **Batch Size**: For large datasets, consider implementing pagination in the sync endpoint
3. **Compression**: Enable gzip compression on the server for large GeoJSON responses
4. **Sync Frequency**: Balance between data freshness and battery/data usage
5. **Local Storage**: Periodically clean up old features that are no longer referenced

## Security

1. **Authentication**: Sync endpoint should require Bearer token authentication
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Data Validation**: Validate GeoJSON data before storing
4. **Encryption**: Use encrypted SharedPreferences for sync metadata on Android

## Troubleshooting

### Common Issues

1. **Sync fails with network error**
   - Check internet connectivity
   - Verify API endpoint URL
   - Ensure Bearer token is valid

2. **Missing data after sync**
   - Check `is_latest` flags in sync_log table
   - Verify entity_type matches between server and client
   - Check for exceptions in sync process

3. **Duplicate entries**
   - Ensure only one `is_latest=true` per entity
   - Check for transaction rollbacks on server

4. **Large sync times**
   - Implement incremental sync properly
   - Add database indexes if needed
   - Consider data pagination

## Future Enhancements

1. **Conflict Resolution**: Implement client-side change tracking for bidirectional sync
2. **Selective Sync**: Allow syncing only specific regions or entity types
3. **Delta Compression**: Send only changed properties instead of full GeoJSON
4. **Push Notifications**: Notify clients of important changes immediately
5. **Sync Analytics**: Track sync performance and success rates