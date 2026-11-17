import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes start with /api
  // Exclude the root health check so it stays at / and /health
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health'],
  });

  // Global validation pipe: automatically validates all DTOs
  // using class-validator decorators.
  //
  // - whitelist: strips any properties not defined in the DTO.
  //   This prevents clients from injecting unexpected fields.
  //   Example: if RegisterDto has {email, password, name}, sending
  //   {email, password, name, isAdmin: true} will silently drop isAdmin.
  //
  // - forbidNonWhitelisted: throw 400 error if unknown properties present.
  //   We enable this for stricter validation — clients should not
  //   send random fields.
  //
  // - transform: automatically converts plain objects to DTO class
  //   instances. Required for class-validator decorators to work.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for frontend requests
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 InterviewAI API running at http://localhost:${port}`);
  console.log(`🔍 Health check: http://localhost:${port}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`);
}
await bootstrap();
