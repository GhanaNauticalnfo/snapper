import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';
import { ResourceType } from '@ghanawaters/shared-models';

@Entity('setting_types')
@Unique(['resource_type', 'setting_key'])
@Index(['resource_type'])
export class SettingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  resource_type: ResourceType;

  @Column({ type: 'varchar', length: 10 })
  setting_key: string;

  @Column({ type: 'varchar', length: 100 })
  display_name: string;

  @Column({ type: 'varchar', length: 20, default: 'string' })
  data_type: string;

  @Column({ default: false })
  is_required: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  toResponseDto() {
    return {
      id: this.id,
      resource_type: this.resource_type,
      setting_key: this.setting_key,
      display_name: this.display_name,
      data_type: this.data_type,
      is_required: this.is_required,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString()
    };
  }
}