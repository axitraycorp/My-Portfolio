import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Shared stand-ins so unit tests never touch a real database or env
export const testProviders = [
  { provide: PrismaService, useValue: {} },
  { provide: ConfigService, useValue: { get: jest.fn() } },
];
