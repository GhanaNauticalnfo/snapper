// apps/api/src/app/volta-depth/volta-depth.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject,
    Logger,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { CACHE_MANAGER } from '@nestjs/cache-manager'; // Correct import
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, DataSource } from 'typeorm';
  import { Cache } from 'cache-manager';
  // Removed fs and path imports
  import * as turf from '@turf/turf';
  import { FeatureCollection, Feature, MultiPolygon, Point } from 'geojson';
  import { v4 as uuidv4 } from 'uuid';
  import { Multer } from 'multer'; // Direct type import
  
  import { VoltaDepthTile } from './entities/volta-depth-tile.entity';
  import { VoltaDepthTileFeature } from './entities/volta-depth-tile-feature.entity';
  // Correctly import the constant and interface from the new file
  import { TileDefinition, VOLTA_TILE_DEFINITIONS } from './constants/volta-tile-definitions.const';
  import { UploadResponseDto } from './dto/upload-response.dto';
  import { TileInfoDto } from './dto/tile-info.dto';
  
  // Interface for temporary storage in cache (remains the same)
  interface TemporaryUploadData {
    tileId: string;
    geoJson: FeatureCollection<MultiPolygon>;
  }
  
  @Injectable()
  export class VoltaDepthService { // No OnModuleInit needed anymore
    private readonly logger = new Logger(VoltaDepthService.name);
    // Directly use the imported constant for tile boundaries
    private readonly tileBoundaries: TileDefinition[] = VOLTA_TILE_DEFINITIONS;
  
    constructor(
      @InjectRepository(VoltaDepthTile)
      private tileRepository: Repository<VoltaDepthTile>,
      @InjectRepository(VoltaDepthTileFeature)
      private featureRepository: Repository<VoltaDepthTileFeature>,
      private dataSource: DataSource,
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
      // Verify boundaries loaded during instantiation (optional sanity check)
      if (!this.tileBoundaries || this.tileBoundaries.length === 0) {
          this.logger.error('CRITICAL: Volta tile boundary definitions failed to load or are empty!');
          // Depending on strictness, you could throw here to prevent the service starting incorrectly
          // throw new InternalServerErrorException('Failed to initialize with tile boundaries.');
      } else {
          this.logger.log(`Initialized with ${this.tileBoundaries.length} Volta tile boundary definitions.`);
      }
    }
  
    // Removed onModuleInit and loadTileBoundaries methods
  
    async processUpload(file: Express.Multer.File): Promise<UploadResponseDto> {
      this.logger.log(`Processing upload for file: ${file.originalname}`);
      await this.debugCache('Before processUpload');
      let geoJson: FeatureCollection<MultiPolygon>;
  
      // 1. Parse GeoJSON (same logic)
      try {
        geoJson = JSON.parse(file.buffer.toString('utf-8'));
        if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
          throw new Error('Invalid GeoJSON structure: Must be a FeatureCollection with features array.');
        }
        if (geoJson.features.length === 0) {
          throw new Error('GeoJSON file contains no features.');
        }
        this.logger.debug(`Parsed ${geoJson.features.length} features.`);
      } catch (error) {
        this.logger.error(`GeoJSON parsing failed: ${error.message}`);
        throw new BadRequestException(`Invalid GeoJSON file: ${error.message}`);
      }
  
      // 2. Deduce Tile and Validate Features (same logic, uses this.tileBoundaries directly)
      let deducedTileId: string | null = null;
      let featureIndex = 0;
      for (const feature of geoJson.features) {
        featureIndex++;
        // ... (rest of feature validation logic is the same)
        if (!feature || typeof feature !== 'object' || feature.type !== 'Feature') {
            throw new BadRequestException(`Invalid GeoJSON structure: Item at index ${featureIndex-1} is not a valid Feature.`);
        }
        if (!feature.geometry) {
           throw new BadRequestException(`Feature ${featureIndex} (FID: ${feature.properties?.fid ?? 'N/A'}) is missing geometry.`);
        }
        if (feature.geometry.type !== 'MultiPolygon') {
            throw new BadRequestException(`Feature ${featureIndex} (FID: ${feature.properties?.fid ?? 'N/A'}) has invalid geometry type '${feature.geometry.type}'. Expected 'MultiPolygon'.`);
        }
  
        const featureTileId = this.findTileForFeature(feature as Feature<MultiPolygon>); // Uses the class property now
        if (!featureTileId) {
          throw new BadRequestException(`Feature ${featureIndex} (FID: ${feature.properties?.fid ?? 'N/A'}) does not fall within any known tile boundary.`);
        }
  
        if (deducedTileId === null) {
          deducedTileId = featureTileId;
        } else if (deducedTileId !== featureTileId) {
          throw new BadRequestException(`All features must belong to the same tile. Found features in both tile '${deducedTileId}' and '${featureTileId}'.`);
        }
      }
  
      if (deducedTileId === null) {
          throw new BadRequestException('Could not deduce a tile ID from the features (file might be empty or features invalid).');
      }
      this.logger.log(`Deduced Tile ID: ${deducedTileId} for all ${geoJson.features.length} features.`);
  
      // 3. Check if tile exists (same logic)
      const existingTile = await this.tileRepository.findOneBy({ id: deducedTileId });
      const isUpdate = !!existingTile;
      const currentVersion = existingTile?.version;
  
      // 4. Store temporarily (same logic)
      const uploadId = uuidv4();
      const temporaryData: TemporaryUploadData = { tileId: deducedTileId, geoJson };
      const ttlSeconds = 15 * 60 * 1000;
      await this.cacheManager.set(uploadId, temporaryData, ttlSeconds);
      this.logger.log(`Temporarily stored upload data with ID: ${uploadId} for ${ttlSeconds} milliseconds.`);
  
      // 5. Return response (same logic)
      return {
        uploadId,
        deducedTileId,
        isUpdate,
        featureCount: geoJson.features.length,
        message: `Validated successfully for Tile ${deducedTileId}. Ready for commit.`,
        currentVersion: currentVersion,
      };
    }
  
    private async debugCache(context: string): Promise<void> {
      try {
        // This might not work with all cache managers - it depends on the implementation
        const cacheKeys = this.cacheManager['store']?.keys ? 
          await this.cacheManager['store'].keys() : 
          'Cache keys not accessible';
          
        this.logger.log(`[${context}] Current cache info: ${JSON.stringify(cacheKeys)}`);
      } catch (error) {
        this.logger.warn(`Could not access cache keys: ${error.message}`);
      }
    }

    private findTileForFeature(feature: Feature<MultiPolygon>): string | null {
       // Uses this.tileBoundaries directly (which is initialized from the constant)
       let representativePoint: Feature<Point>;
         try {
             representativePoint = turf.pointOnFeature(feature);
         } catch (e) {
             this.logger.warn(`Could not calculate pointOnFeature for feature FID ${feature.properties?.fid ?? 'N/A'}, attempting centroid. Error: ${e.message}`);
             try {
                  representativePoint = turf.centroid(feature);
             } catch(e2) {
                  this.logger.error(`Could not get representative point (pointOnFeature or centroid) for feature FID ${feature.properties?.fid ?? 'N/A'}. Error: ${e2.message}`);
                  return null;
             }
         }
  
        // Iterate over the boundaries loaded from the constant
        for (const tileDef of this.tileBoundaries) {
            try {
              if (turf.booleanPointInPolygon(representativePoint, tileDef.geometry)) {
                  return tileDef.properties.id; // Return ID from the properties of the constant object
              }
            } catch(turfError) {
                this.logger.error(`Error during pointInPolygon check for tile ${tileDef.properties.id} and feature FID ${feature.properties?.fid ?? 'N/A'}: ${turfError.message}`);
            }
        }
        return null;
    }

    async deleteTile(tileId: string): Promise<void> {
      this.logger.log(`Attempting to delete tile with ID: ${tileId}`);
      
      // Check if the tile exists first
      const existingTile = await this.tileRepository.findOneBy({ id: tileId });
      if (!existingTile) {
        this.logger.warn(`Deletion failed: Tile with ID ${tileId} not found.`);
        throw new NotFoundException(`Tile with ID '${tileId}' not found.`);
      }
      
      // Use a transaction to ensure both tile and features are deleted atomically
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        this.logger.log(`Starting transaction for deletion of Tile ID: ${tileId}`);
        
        // Step 1: Delete all the features that belong to this tile
        const deleteFeatureResult = await queryRunner.manager.delete(
          VoltaDepthTileFeature, 
          { tileId }
        );
        this.logger.log(`Deleted ${deleteFeatureResult.affected ?? 0} features for Tile ID: ${tileId}`);
        
        // Step 2: Delete the tile metadata
        const deleteTileResult = await queryRunner.manager.delete(
          VoltaDepthTile, 
          { id: tileId }
        );
        
        if (deleteTileResult.affected === 0) {
          throw new Error(`Failed to delete tile metadata for ID: ${tileId}`);
        }
        
        this.logger.log(`Deleted tile metadata for Tile ID: ${tileId}`);
        
        // Commit the transaction
        await queryRunner.commitTransaction();
        this.logger.log(`Transaction committed successfully. Tile ${tileId} and its features have been deleted.`);
        
      } catch (error) {
        this.logger.error(`Error during deletion transaction for Tile ID ${tileId}: ${error.message}`, error.stack);
        await queryRunner.rollbackTransaction();
        this.logger.log(`Transaction rolled back for Tile ID: ${tileId}`);
        throw new InternalServerErrorException(`Failed to delete tile ${tileId}: ${error.message}`);
      } finally {
        await queryRunner.release();
        this.logger.log(`Query runner released for Tile ID: ${tileId}`);
      }
    }
  
    async commitUpload(uploadId: string): Promise<VoltaDepthTile> {
      this.logger.log(`Attempting to commit upload ID: ${uploadId}`);
      const temporaryData = await this.cacheManager.get<TemporaryUploadData>(uploadId);
      if (!temporaryData) {
        this.logger.warn(`Commit failed: No temporary data found for upload ID ${uploadId} (expired or invalid).`);
        throw new NotFoundException(`Upload session with ID ${uploadId} not found or expired.`);
      }
    
      const { tileId, geoJson } = temporaryData;
      this.logger.log(`Found temporary data for Tile ID: ${tileId}, Features: ${geoJson.features.length}`);
    
      const existingTile = await this.tileRepository.findOneBy({ id: tileId });
      const nextVersion = existingTile ? existingTile.version + 1 : 1;
      this.logger.log(`Tile ${tileId}: Current version is ${existingTile?.version ?? 'N/A'}, next version will be ${nextVersion}`);
    
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
    
      try {
        this.logger.log(`Starting transaction for Tile ID: ${tileId}, Version: ${nextVersion}`);
        
        // STEP 1: First ensure the parent tile record exists (or create it) BEFORE handling features
        // This ensures the foreign key constraint will be satisfied
        const tileMetaDataToSave: Partial<VoltaDepthTile> = {
          id: tileId,
          numberOfFeatures: geoJson.features.length,
          version: nextVersion,
        };
        
        // If it's a new tile, we need to set initial values
        if (!existingTile) {
          this.logger.log(`Creating new tile record for ID: ${tileId}`);
        }
        
        const savedTileMetaData = await queryRunner.manager.save(VoltaDepthTile, tileMetaDataToSave);
        this.logger.log(`Upserted Tile metadata for ID: ${tileId} with version ${savedTileMetaData.version}`);
        
        // STEP 2: Now we can safely delete existing features since the parent record exists
        const deleteResult = await queryRunner.manager.delete(VoltaDepthTileFeature, { tileId: tileId });
        this.logger.log(`Deleted ${deleteResult.affected ?? 0} existing features for Tile ID: ${tileId}`);
    
        // STEP 3: Create and insert new features
        const newFeatures = geoJson.features.map((feature, index) => {
          const featureEntity = new VoltaDepthTileFeature();
          featureEntity.tileId = tileId;
          featureEntity.fid = feature.properties?.fid ?? null;
          featureEntity.groupCode = feature.properties?.group ?? null;
          featureEntity.description = feature.properties?.Description ?? null;
          if (!feature.geometry || feature.geometry.type !== 'MultiPolygon') {
              throw new Error(`Internal error: Invalid geometry found during commit for feature ${index+1} in tile ${tileId}`);
          }
          featureEntity.geom = feature.geometry;
          return featureEntity;
        });
    
        await queryRunner.manager.save(VoltaDepthTileFeature, newFeatures, { chunk: 100 });
        this.logger.log(`Inserted ${newFeatures.length} new features.`);
    
        await queryRunner.commitTransaction();
        this.logger.log(`Transaction committed successfully for Tile ID: ${tileId}`);
    
        await this.cacheManager.del(uploadId);
        this.logger.log(`Removed temporary data for upload ID: ${uploadId}`);
    
        return savedTileMetaData;
    
      } catch (error) {
        this.logger.error(`Error during commit transaction for Tile ID ${tileId}, Upload ID ${uploadId}: ${error.message}`, error.stack);
        await queryRunner.rollbackTransaction();
        this.logger.log(`Transaction rolled back for Tile ID: ${tileId}`);
        throw new InternalServerErrorException(`Failed to commit data for tile ${tileId}.`);
      } finally {
        await queryRunner.release();
        this.logger.log(`Query runner released for Tile ID: ${tileId}`);
      }
    }
  
    async listTiles(): Promise<TileInfoDto[]> {
      // ... (listTiles logic remains exactly the same - check previous response) ...
       const tiles = await this.tileRepository.find({
              order: { id: 'ASC' }
          });
          return tiles.map(tile => ({
              id: tile.id,
              numberOfFeatures: tile.numberOfFeatures,
              created: tile.created,
              lastUpdated: tile.lastUpdated,
              version: tile.version,
          }));
    }
  
     async getTileInfo(tileId: string): Promise<TileInfoDto> {
      // ... (getTileInfo logic remains exactly the same - check previous response) ...
        const tile = await this.tileRepository.findOneBy({ id: tileId });
        if (!tile) {
            throw new NotFoundException(`Tile with ID '${tileId}' not found.`);
        }
        return {
            id: tile.id,
            numberOfFeatures: tile.numberOfFeatures,
            created: tile.created,
            lastUpdated: tile.lastUpdated,
            version: tile.version,
        };
     }
  }