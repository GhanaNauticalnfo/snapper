# Sync Migration Guide

This guide helps developers add sync functionality to existing features in the Snapper API.

## Prerequisites

- Sync module is already set up (`apps/api/src/app/sync/`)
- Entity has create/update timestamps
- Entity can be converted to GeoJSON format

## Step-by-Step Migration

### 1. Import Sync Module

In your feature module (e.g., `anchorages.module.ts`):

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncModule } from '../sync/sync.module'; // Add this
import { Anchorage } from './anchorage.entity';
import { AnchorageService } from './anchorage.service';
import { AnchorageController } from './anchorage.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Anchorage]),
    SyncModule  // Add this
  ],
  controllers: [AnchorageController],
  providers: [AnchorageService],
  exports: [AnchorageService],
})
export class AnchoragesModule {}
```

### 2. Update Service

Inject `SyncService` and add logging to CRUD operations:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncService } from '../sync/sync.service'; // Add this
import { Anchorage } from './anchorage.entity';

@Injectable()
export class AnchorageService {
  constructor(
    @InjectRepository(Anchorage)
    private anchorageRepository: Repository<Anchorage>,
    private syncService: SyncService  // Add this
  ) {}

  async create(data: CreateAnchorageDto): Promise<Anchorage> {
    const anchorage = this.anchorageRepository.create(data);
    const saved = await this.anchorageRepository.save(anchorage);
    
    // Add sync logging
    await this.syncService.logChange(
      'anchorage',                        // entity_type
      saved.id.toString(),                // entity_id
      'create',                           // action
      this.convertToGeoJson(saved)        // data
    );
    
    return saved;
  }

  async update(id: number, data: UpdateAnchorageDto): Promise<Anchorage> {
    const anchorage = await this.findOne(id);
    Object.assign(anchorage, data);
    const saved = await this.anchorageRepository.save(anchorage);
    
    // Add sync logging
    await this.syncService.logChange(
      'anchorage',
      saved.id.toString(),
      'update',
      this.convertToGeoJson(saved)
    );
    
    return saved;
  }

  async remove(id: number): Promise<void> {
    const anchorage = await this.findOne(id);
    await this.anchorageRepository.remove(anchorage);
    
    // Add sync logging (no data for deletes)
    await this.syncService.logChange(
      'anchorage',
      id.toString(),
      'delete'
    );
  }
  
  // Add GeoJSON converter
  private convertToGeoJson(anchorage: Anchorage): any {
    return {
      type: 'Feature',
      id: anchorage.id,
      geometry: {
        type: 'Point',
        coordinates: [anchorage.lng, anchorage.lat]
      },
      properties: {
        id: anchorage.id,
        name: anchorage.name,
        description: anchorage.description,
        capacity: anchorage.capacity,
        depth: anchorage.depth,
        enabled: anchorage.enabled,
        created: anchorage.created,
        last_updated: anchorage.last_updated
      }
    };
  }
}
```

### 3. Test Sync Integration

Create a test file `anchorage.service.spec.ts`:

```typescript
describe('AnchorageService with Sync', () => {
  let service: AnchorageService;
  let syncService: SyncService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AnchorageService,
        {
          provide: getRepositoryToken(Anchorage),
          useValue: mockRepository,
        },
        {
          provide: SyncService,
          useValue: { logChange: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AnchorageService>(AnchorageService);
    syncService = module.get<SyncService>(SyncService);
  });

  it('should log to sync on create', async () => {
    const data = { name: 'Test Anchorage', lat: 5.5, lng: -0.2 };
    await service.create(data);
    
    expect(syncService.logChange).toHaveBeenCalledWith(
      'anchorage',
      expect.any(String),
      'create',
      expect.objectContaining({
        type: 'Feature',
        geometry: { type: 'Point' }
      })
    );
  });
});
```

### 4. Update Android Client

Add the new entity type to your Android sync handling:

```kotlin
// In MapScreen.kt setupMapLayers()
style.addSource(GeoJsonSource("anchorages", "{}"))

val anchorageLayer = SymbolLayer("anchorage-layer", "anchorages")
anchorageLayer.setProperties(
    PropertyFactory.iconImage("anchorage-icon"),
    PropertyFactory.iconSize(1.5f)
)
style.addLayer(anchorageLayer)

// In updateMapData()
syncManager.getFeatureCollection("anchorage")?.let { 
    style.getSourceAs<GeoJsonSource>("anchorages")?.setGeoJson(it) 
}
```

## Migration Checklist

- [ ] Import `SyncModule` in your feature module
- [ ] Inject `SyncService` into your service
- [ ] Add `convertToGeoJson()` method
- [ ] Call `syncService.logChange()` in create method
- [ ] Call `syncService.logChange()` in update method
- [ ] Call `syncService.logChange()` in delete method
- [ ] Write unit tests for sync integration
- [ ] Update Android client to handle new entity type
- [ ] Test end-to-end sync functionality

## Common Patterns

### Point Features (Markers, Hazards, Anchorages)
```typescript
geometry: {
  type: 'Point',
  coordinates: [entity.lng, entity.lat]
}
```

### Line Features (Routes, Channels)
```typescript
geometry: {
  type: 'LineString',
  coordinates: entity.waypoints
    .sort((a, b) => a.order - b.order)
    .map(wp => [wp.lng, wp.lat])
}
```

### Polygon Features (Areas, Zones)
```typescript
geometry: {
  type: 'Polygon',
  coordinates: [
    entity.boundary.map(pt => [pt.lng, pt.lat])
  ]
}
```

## Troubleshooting

### Sync not working
1. Check module imports
2. Verify service injection
3. Check sync_log table for entries
4. Test GeoJSON conversion separately

### Android not displaying
1. Check entity_type string matches
2. Verify layer setup
3. Check GeoJSON validity
4. Enable sync logging

### Performance issues
1. Batch sync operations in transactions
2. Add indexes on frequently queried fields
3. Consider pagination for large datasets

## Best Practices

1. **Consistent Naming**: Use singular entity types (`anchorage`, not `anchorages`)
2. **Complete GeoJSON**: Include all relevant properties
3. **Error Handling**: Wrap sync calls in try-catch
4. **Testing**: Always test sync integration
5. **Documentation**: Update API docs with new entity type