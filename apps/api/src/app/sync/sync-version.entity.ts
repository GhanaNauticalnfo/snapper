import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('sync_version')
export class SyncVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  major_version: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'boolean', default: false })
  is_current: boolean;
}