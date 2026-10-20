import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactInput } from './dto/contact.input';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async createMessage(data: ContactInput) {
    return this.prisma.contactMessage.create({
      data,
    });
  }
}
