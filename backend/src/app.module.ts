import { join } from 'path';
import type { Request } from 'express';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ContactModule } from './contact/contact.module';
import { ProjectModule } from './project/project.module';
import { SkillModule } from './skill/skill.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // In production keep the schema in memory instead of writing to src/
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? true
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: Request }) => ({ req }),
      // Surface class-validator details instead of a bare "Bad Request Exception"
      formatError: (error) => {
        const original = error.extensions?.originalError as
          | { message?: string | string[] }
          | undefined;
        return {
          message: Array.isArray(original?.message)
            ? original.message.join(', ')
            : error.message,
          path: error.path,
          extensions: { code: error.extensions?.code },
        };
      },
    }),
    PrismaModule,
    ContactModule,
    ProjectModule,
    SkillModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
