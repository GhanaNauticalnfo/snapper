import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  toResponseDto() {
    return {
      key: this.key,
      value: this.value,
      created: this.created.toISOString(),
      last_updated: this.last_updated.toISOString()
    };
  }
}