import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './models/project.model';
import { CreateProjectDto } from './dto/create-project.dto';

@Resolver(() => Project)
export class ProjectResolver {
  constructor(private readonly projectService: ProjectService) {}

  @Query(() => [Project])
  async projects() {
    return this.projectService.findAll();
  }

  @Mutation(() => Project)
  async createProject(@Args('input') input: CreateProjectDto) {
    return this.projectService.create(input);
  }
}
