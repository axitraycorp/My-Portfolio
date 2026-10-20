import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Host part of the connection string only, so logs never include the password
function databaseHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return '(DATABASE_URL is not set)';
  try {
    return new URL(url.trim()).host;
  } catch {
    return '(DATABASE_URL is not a valid URL)';
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log(`Connecting to database at ${databaseHost()}`);
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      this.logger.error(`Database connection failed: ${String(err)}`);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
