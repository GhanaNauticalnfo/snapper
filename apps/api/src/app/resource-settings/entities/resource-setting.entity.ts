import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SettingType, ResourceType } from './setting-type.entity';

@Entity('resource_settings')
@Unique(['resource_type', 'resource_id', 'setting_key'])
@Index(['resource_type', 'resource_id'])
export class ResourceSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  resource_type: ResourceType;

  @Column()
  resource_id: number;

  @Column({ type: 'varchar', length: 10 })
  setting_key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => SettingType, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'resource_type', referencedColumnName: 'resource_type' },
    { name: 'setting_key', referencedColumnName: 'setting_key' }
  ])
  setting_type: SettingType;

  toResponseDto() {
    return {
      id: this.id,
      resource_type: this.resource_type,
      resource_id: this.resource_id,
      setting_key: this.setting_key,
      value: this.value,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString()
    };
  }
}