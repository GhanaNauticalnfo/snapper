import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TreeStubGroup } from './tree-stub-group.entity';

@Entity('tree_stubs')
export class TreeStub {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group_id: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Geometry',
    srid: 4326
  })
  geometry: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => TreeStubGroup, group => group.tree_stubs)
  @JoinColumn({ name: 'group_id' })
  group: TreeStubGroup;

  toResponseDto() {
    return {
      id: this.id,
      group_id: this.group_id,
      geometry: this.geometry,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString()
    };
  }
}