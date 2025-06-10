import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TreeStub } from './tree-stub.entity';

@Entity('tree_stub_groups')
export class TreeStubGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TreeStub, treeStub => treeStub.group)
  tree_stubs: TreeStub[];

  toResponseDto() {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
      tree_stub_count: this.tree_stubs?.length || 0
    };
  }
}