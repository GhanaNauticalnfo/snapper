# Shared Libraries

This directory contains shared libraries used across the Ghana Waters monorepo applications. These libraries promote code reuse, maintain consistency, and ensure type safety between the API, admin dashboard, public frontend, and tracker applications.

## Libraries Overview

### @ghanawaters/map
Provides shared mapping functionality using MapLibre GL. This library contains all map-related components, services, and layer implementations used for maritime visualization.

**Key Features:**
- Core map service for managing MapLibre instances
- Layer manager with plugin-based architecture for extensibility
- Pre-built layers for AIS ships, depth data, navigation warnings, and routes
- Reusable map component with consistent styling
- OpenStreetMap (OSM) style configurations

### @ghanawaters/shared-models
Contains TypeScript interfaces, types, and data models shared between backend and frontend applications. This ensures type consistency across the entire codebase and prevents data structure mismatches.

**Key Models:**
- Geographic types with GeoJSON compliance (GeoPoint, LatLng, Coordinates)
- Entity models (Vessel, VesselType, Device, Route, KmlDataset, VoltaDepth)
- Settings and configuration interfaces
- Integration models for external systems (Niord, vessel telemetry)
- Utility classes for coordinate validation and Ghana boundary checks

### @ghanawaters/shared
Provides reusable Angular components, pipes, services, and utilities for UI consistency across frontend applications.

**Key Components:**
- Common UI components (BoatIcon, SearchDropdown, ResourceList)
- Utility pipes (TimeAgo for human-readable dates, VesselId formatting)
- Shared services (Settings management)
- Helper utilities for vessel ID validation and formatting

## Usage
Import libraries using their workspace aliases:
```typescript
import { Vessel, GeoPoint } from '@ghanawaters/shared-models';
import { MapService } from '@ghanawaters/map';
import { TimeAgoPipe } from '@ghanawaters/shared';
```

## Development Guidelines
- Always define new shared interfaces in the appropriate library
- Export all public APIs through the library's index.ts file
- Maintain backward compatibility when updating shared models
- Add unit tests for new utilities and services
- Document complex models and services with JSDoc comments