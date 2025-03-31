// apps/api/src/app/volta-depth/volta-depth.module.ts

import { Module, Logger } from '@nestjs/common';
// Import CacheModule from its specific package
import { CacheModule } from '@nestjs/cache-manager';
// Import TypeOrmModule for entity registration
import { TypeOrmModule } from '@nestjs/typeorm';

// Import the entities used within this module
import { VoltaDepthTile } from './entities/volta-depth-tile.entity';
import { VoltaDepthTileFeature } from './entities/volta-depth-tile-feature.entity';

// Import the controller and service for this module
import { VoltaDepthController } from './volta-depth.controller';
import { VoltaDepthService } from './volta-depth.service';

// Optional: If using a specific cache store like Redis, import its configuration helpers
// import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    // Register the TypeORM entities this module is responsible for.
    // This makes the repositories for VoltaDepthTile and VoltaDepthTileFeature available for injection.
    TypeOrmModule.forFeature([VoltaDepthTile, VoltaDepthTileFeature]),

    // Register the CacheModule to enable caching capabilities within this module.
    // This provides the injectable CACHE_MANAGER token.
    CacheModule.register({
      // Default Time-To-Live for cached items in seconds.
      // Upload sessions will expire after 15 minutes if not committed.
      ttl: 15 * 60,

      // Maximum number of items to store in the cache (applies primarily to in-memory store).
      max: 100,

      // Keep the cache instance provided by this registration local to this module.
      // If set to true, CACHE_MANAGER could be injected anywhere without importing VoltaDepthModule.
      isGlobal: false,

      // --- Example: Configuration for Redis Store (Uncomment and configure if needed) ---
      // // Ensure 'cache-manager-redis-store' is installed
      // store: redisStore,
      // host: process.env.REDIS_HOST || 'localhost', // Read from environment variables
      // port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // password: process.env.REDIS_PASSWORD,
      // db: parseInt(process.env.REDIS_DB || '0', 10),
      // --- End Redis Example ---
    }),
  ],
  // Declare the controllers that belong to this module.
  // NestJS will map incoming requests based on the decorators within these controllers.
  controllers: [VoltaDepthController],

  // Declare the providers (services, repositories, factories, etc.) that belong to this module.
  // These will be instantiated by the NestJS dependency injector and can be injected elsewhere
  // within this module (or exported for use in other modules).
  providers: [
    VoltaDepthService, // The core service containing business logic.
    Logger, // Provide NestJS Logger, useful if injecting it explicitly somewhere.
            // VoltaDepthService already instantiates its own Logger, so this is somewhat redundant
            // unless another component in this module needs an injected Logger.
  ],
  // exports: [VoltaDepthService] // Uncomment if other modules need to inject VoltaDepthService
})
export class VoltaDepthModule {}