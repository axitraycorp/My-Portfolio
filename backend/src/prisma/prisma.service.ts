import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import { WebSocket } from 'ws';

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

// Neon is reached over WebSockets (port 443) via its serverless driver. Some
// hosts (e.g. Render) cannot open direct Postgres connections to Neon on 5432.
function neonAdapter(): PrismaNeon | undefined {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !databaseHost().endsWith('.neon.tech')) return undefined;
  neonConfig.webSocketConstructor = WebSocket;
  return new PrismaNeon({ connectionString: url });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly driver: string;

  constructor() {
    const adapter = neonAdapter();
    super(adapter ? { adapter } : undefined);
    this.driver = adapter ? 'Neon serverless driver' : 'Prisma engine';
  }

  async onModuleInit() {
    this.logger.log(
      `Connecting to database at ${databaseHost()} via ${this.driver}`,
    );
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
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
