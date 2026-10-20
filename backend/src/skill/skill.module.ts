import { Module } from '@nestjs/common';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';
import { SkillResolver } from './skill.resolver';

@Module({
  controllers: [SkillController],
  providers: [SkillService, SkillResolver],
})
export class SkillModule {}
