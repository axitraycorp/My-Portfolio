import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const withSkills = {
  skills: { include: { skill: true } },
} satisfies Prisma.ProjectInclude;

type ProjectWithSkills = Prisma.ProjectGetPayload<{
  include: typeof withSkills;
}>;

// Flatten the ProjectSkill join rows into a plain Skill[] for API consumers
function toProject(project: ProjectWithSkills) {
  return { ...project, skills: project.skills.map((ps) => ps.skill) };
}

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: withSkills,
    });
    return projects.map(toProject);
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: withSkills,
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return toProject(project);
  }

  async create({ skillIds = [], ...data }: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        ...data,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
      },
      include: withSkills,
    });
    return toProject(project);
  }

  async update(id: string, { skillIds, ...data }: UpdateProjectDto) {
    await this.findOne(id);
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        // When skillIds is sent, it replaces the existing skill list
        ...(skillIds && {
          skills: {
            deleteMany: {},
            create: skillIds.map((skillId) => ({ skillId })),
          },
        }),
      },
      include: withSkills,
    });
    return toProject(project);
  }

  async delete(id: string) {
    const project = await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return project;
  }
}
