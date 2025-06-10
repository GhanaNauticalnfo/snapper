import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreeStubGroup } from './tree-stub-group.entity';
import { TreeStub } from './tree-stub.entity';
import { TreeStubGroupService } from './tree-stub-group.service';
import { TreeStubService } from './tree-stub.service';
import { TreeStubGroupController } from './tree-stub-group.controller';
import { TreeStubController } from './tree-stub.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TreeStubGroup, TreeStub])],
  controllers: [TreeStubGroupController, TreeStubController],
  providers: [TreeStubGroupService, TreeStubService],
  exports: [TreeStubGroupService, TreeStubService],
})
export class TreeStubsModule {}