// apps/api/src/app/volta-depth/entities/volta-depth-tile.entity.ts
import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { VoltaDepthTileFeature } from './volta-depth-tile-feature.entity';
  
  @Entity('volta_depth_tile')
  export class VoltaDepthTile {
    @PrimaryColumn({ type: 'varchar', length: 10 }) // Tile ID like 'AA', 'BB'
    id: string;
  
    @Column({ type: 'int' })
    numberOfFeatures: number;
  
    @CreateDateColumn()
    created: Date; // Handled by TypeORM
  
    @UpdateDateColumn()
    lastUpdated: Date; // Handled by TypeORM
  
    @Column({ type: 'integer', default: 1 }) // Start version at 1
    version: number; // Manually incremented in service
  
    @OneToMany(() => VoltaDepthTileFeature, (feature) => feature.tile)
    features: VoltaDepthTileFeature[];
  }