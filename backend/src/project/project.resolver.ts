import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './models/project.model';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AdminGuard } from '../auth/admin.guard';

@Resolver(() => Project)
export class ProjectResolver {
  constructor(private readonly projectService: ProjectService) {}

  @Query(() => [Project])
  async projects() {
    return this.projectService.findAll();
  }

  @Query(() => Project)
  async project(@Args('id', { type: () => ID }) id: string) {
    return this.projectService.findOne(id);
  }

  @Mutation(() => Project)
  @UseGuards(AdminGuard)
  async createProject(@Args('input') input: CreateProjectDto) {
    return this.projectService.create(input);
  }

  @Mutation(() => Project)
  @UseGuards(AdminGuard)
  async updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProjectDto,
  ) {
    return this.projectService.update(id, input);
  }

  @Mutation(() => Project)
  @UseGuards(AdminGuard)
  async deleteProject(@Args('id', { type: () => ID }) id: string) {
    return this.projectService.delete(id);
  }
}
