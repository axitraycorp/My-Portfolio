import { Injectable } from '@nestjs/common';
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

  async create(data: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        name: data.name,
      },
    });
  }

  async delete(id: string): Promise<Skill> {
    return this.prisma.skill.delete({
      where: { id },
    });
  }
}
