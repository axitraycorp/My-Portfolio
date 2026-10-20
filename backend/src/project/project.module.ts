import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectResolver } from './project.resolver';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, ProjectResolver],
})
export class ProjectModule {}
