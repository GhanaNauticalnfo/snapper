// apps/api/src/app/volta-depth/entities/volta-depth-tile-feature.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { VoltaDepthTile } from './volta-depth-tile.entity';
  // Remove the geojson import:
  // import { MultiPolygon } from 'geojson';
  
  @Entity('volta_depth_tile_feature')
  export class VoltaDepthTileFeature {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Index()
    @Column({ type: 'bigint', nullable: true })
    fid?: number;
  
    @Column({ type: 'integer', nullable: true })
    groupCode?: number;
  
    @Column({ type: 'text', nullable: true })
    description?: string;
  
    @Index('volta_depth_tile_feature_geom_idx', { spatial: true })
    @Column({
      type: 'geometry', // Still tell TypeORM/Postgres it's a geometry type
      spatialFeatureType: 'MultiPolygon', // Still specify this for clarity/potential db use
      srid: 4326,
      nullable: false,
    })
    // Use 'object' or 'any' if you don't need strict typing within NestJS.
    // 'object' is slightly better than 'any'.
    geom: object; // Changed from MultiPolygon to object
  
    @ManyToOne(() => VoltaDepthTile, (tile) => tile.features, {
      nullable: false,
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tileId' })
    tile: VoltaDepthTile;
  
    @Column({ type: 'varchar', length: 10 })
    tileId: string;
  }