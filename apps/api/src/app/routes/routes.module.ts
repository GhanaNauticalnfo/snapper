import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './route.entity';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [TypeOrmModule.forFeature([Route]), SyncModule],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService],
})
export class RoutesModule {}