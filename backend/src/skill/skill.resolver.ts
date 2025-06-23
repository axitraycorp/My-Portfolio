import { Resolver, Query } from '@nestjs/graphql';
import { SkillService } from './skill.service';
import { Skill } from './models/skill.model';

@Resolver(() => Skill)
export class SkillResolver {
  constructor(private readonly skillService: SkillService) {}

  @Query(() => [Skill])
  async skills() {
    return this.skillService.findAll();
  }
}
