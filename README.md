# Ghana Waters - Ghana Maritime Navigation System

A comprehensive maritime navigation and tracking system for Ghana's waterways, built with Angular, NestJS, and MapLibre.

## Overview

Ghana Waters provides real-time vessel tracking, navigation aids, and offline-capable map data for maritime operations. The system consists of:

- **Admin Dashboard** - Vessel management and monitoring interface
- **Public Frontend** - Public-facing map with navigation data
- **API Backend** - RESTful API with real-time MQTT support
- **Android App** - Mobile vessel tracking and navigation (separate repository)

## Key Features

- 🚢 **Real-time Vessel Tracking** - Track vessels via GPS with MQTT updates
- 🗺️ **Offline Maps** - Sync navigation data for offline use
- 📍 **Navigation Aids** - Routes and waypoints for navigation
- 🔒 **Secure Authentication** - Device token system for vessel tracking
- 📊 **Spatial Data** - PostGIS-powered geographic queries
- 🔄 **Incremental Sync** - Efficient data synchronization

## Tech Stack

- **Frontend**: Angular 19, PrimeNG, MapLibre GL JS
- **Backend**: NestJS 10, TypeORM, PostgreSQL 17 with PostGIS
- **Infrastructure**: Docker, Nx monorepo, TypeScript
- **Real-time**: Apache Artemis MQTT broker
- **Maps**: Martin vector tile server

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL client tools (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ghanawaters.git
cd ghanawaters

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Martin, Artemis)
npm run db:up

# Run database migrations
npm run migration:run:dev

# Start the API server
npx nx serve api

# In another terminal, start the admin dashboard
npx nx serve admin
```

### Access Points

- Admin Dashboard: http://localhost:4201
- Public Frontend: http://localhost:4200
- API: http://localhost:3000
- Martin Tiles: http://localhost:4000
- Artemis Console: http://localhost:8161 (admin/admin)

## Project Structure

```
ghanawaters/
├── apps/
│   ├── admin/         # Admin dashboard (Angular + PrimeNG)
│   ├── api/          # Backend API (NestJS)
│   └── frontend/     # Public map interface (Angular + MapLibre)
├── libs/
│   ├── map/          # Shared MapLibre components
│   └── shared-models/ # Shared TypeScript models
├── docker/           # Docker configurations
└── docs/            # Documentation
```

## Development

### Common Commands

```bash
# Development
npx nx serve api          # Start API server
npx nx serve admin        # Start admin dashboard
npx nx serve frontend     # Start public frontend

# Testing
npx nx test api           # Run API tests
npx nx test admin         # Run admin tests
npx nx affected:test      # Test affected projects

# Building
npx nx build api          # Build API
npx nx build admin        # Build admin dashboard

# Database
npm run migration:generate -- --name=YourMigrationName
npm run migration:run:dev
npm run migration:revert:dev

# Infrastructure
npm run db:up            # Start all services
npm run db:down          # Stop all services
npm run db:logs          # View service logs
```

### API Endpoints

Key endpoints include:

- `GET /api/data/sync?since={timestamp}` - Sync endpoint for offline data
- `GET/POST/PUT/DELETE /api/routes` - Navigation routes
- `GET/POST/PUT/DELETE /api/markers` - Map markers
- `GET/POST/PUT/DELETE /api/hazards` - Navigation hazards
- `POST /api/devices/activate` - Device activation
- `POST /api/vessels/telemetry/report` - Position reporting

See [API Reference](docs/api-reference.md) for complete documentation.

## Offline Sync Feature

The system includes a sophisticated offline-first sync mechanism:

- **Incremental Updates** - Only sync changed data
- **Conflict Resolution** - Server version wins
- **Background Sync** - Automatic periodic updates
- **Local Storage** - Room database on Android

See [Sync Feature Documentation](docs/sync-feature.md) for implementation details.

## Configuration

### Environment Variables

Create `.env.development` in the root directory:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=ghanawaters_user
DATABASE_PASSWORD=ghanawaters_password
DATABASE_NAME=ghanawaters_db
DATABASE_SSL=false

# TypeORM
TYPEORM_LOGGING=true

# Artemis MQTT
ARTEMIS_USER=artemis
ARTEMIS_PASSWORD=artemis
```

### Production Deployment

For production deployment:

1. Update environment variables for production database
2. Enable SSL for database connections
3. Configure proper authentication (Keycloak)
4. Set up reverse proxy (nginx)
5. Enable CORS for your domains

## Testing

```bash
# Unit tests
npx nx test api
npx nx test admin

# E2E tests
npx nx e2e api-e2e
npx nx e2e admin-e2e

# Run all tests
npx nx run-many -t test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Run `npx nx lint` before committing
- Follow Angular and NestJS conventions
- Write tests for new features
- Update documentation as needed

## Documentation

- [Sync Feature Guide](docs/sync-feature.md) - Offline sync implementation
- [API Reference](docs/api-reference.md) - Complete API documentation
- [Migration Guide](docs/sync-migration-guide.md) - Adding sync to features
- [Architecture Decisions](docs/architecture.md) - System design choices

## License

This project is proprietary software for the Ghana Maritime Authority.

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check existing documentation

---

Built with ❤️ for safer maritime navigation in Ghana