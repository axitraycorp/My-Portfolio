import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SkillService } from './skill.service';
import { Skill } from './models/skill.model';
import { CreateSkillDto } from './dto/create-skill.dto';
import { AdminGuard } from '../auth/admin.guard';

@Resolver(() => Skill)
export class SkillResolver {
  constructor(private readonly skillService: SkillService) {}

  @Query(() => [Skill])
  async skills() {
    return this.skillService.findAll();
  }

  @Mutation(() => Skill)
  @UseGuards(AdminGuard)
  async createSkill(@Args('input') input: CreateSkillDto) {
    return this.skillService.create(input);
  }
}
