import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('sync_log')
@Index(['created_at', 'is_latest'], { where: 'is_latest = true' })
@Index(['entity_id', 'entity_type', 'is_latest'])
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'varchar', length: 100 })
  entity_id: string;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'boolean', default: true })
  is_latest: boolean;
}