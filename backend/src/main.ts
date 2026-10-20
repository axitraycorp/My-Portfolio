import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    // Comma-separated list, e.g. "http://localhost:3000,https://hagon.dev"
    origin: (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').split(','),
  });

  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
