import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // your frontend dev server
    credentials: true, // only if you're using cookies/auth
  });

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
