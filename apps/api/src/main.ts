import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: all routes start with /api
  // Exclude root health check and docs
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'docs'],
  });

  // Global validation pipe: automatically validates all DTOs
  // using class-validator decorators.
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

  // Defense-in-depth: Enterprise security headers
  app.use((_req: unknown, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), display-capture=(self)',
    );
    if (typeof res.removeHeader === 'function') {
      res.removeHeader('X-Powered-By');
    }
    next();
  });

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('InterviewAI Platform API')
    .setDescription(
      'Enterprise-grade AI Technical Interview Platform API — real-time voice & text interviews, multi-stage state machine orchestrator, verifiable technical evidence extraction, independent rubric evaluations, and comprehensive candidate reports.',
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication and user management')
    .addTag('candidates', 'Candidate profile management')
    .addTag('tracks', 'Interview tracks, domains, and question bank')
    .addTag('interviews', 'Live and historical interview sessions')
    .addTag('evidence', 'Verifiable technical evidence ledger')
    .addTag('evaluation', 'Independent post-interview rubric evaluation')
    .addTag(
      'reports',
      'Comprehensive assessment reports and candidate dashboard metrics',
    )
    .addTag('ai', 'AI provider status and diagnostic benchmarks')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    customSiteTitle: 'InterviewAI API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'InterviewAI API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 InterviewAI API running at http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  console.log(`🔍 Health check: http://localhost:${port}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`);
}
await bootstrap();
