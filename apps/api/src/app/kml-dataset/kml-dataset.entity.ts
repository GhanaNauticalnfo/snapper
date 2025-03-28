// kml-dataset.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class KmlDataset {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  @Column('text')
  kml: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('boolean', { default: true })
  enabled: boolean;
}