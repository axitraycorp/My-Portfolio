import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Skill } from '@prisma/client';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class SkillService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Idempotent: returns the existing skill if the name is already taken
  async create(data: CreateSkillDto): Promise<Skill> {
    const name = data.name.trim();
    return this.prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async delete(id: string): Promise<Skill> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException(`Skill ${id} not found`);
    return this.prisma.skill.delete({
      where: { id },
    });
  }
}
