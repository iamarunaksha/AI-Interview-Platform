import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProd
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // Global prefix: all routes start with /api
  // Exclude root health checks and docs
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'health/live', 'health/ready', 'docs'],
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

  // Enable CORS for frontend requests (supports single or comma-separated origins)
  const rawCors =
    process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://127.0.0.1:3000';
  const corsOrigins = rawCors.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  // Enable trust proxy for reverse proxy deployments (Cloudflare / ALB / Nginx)
  const httpAdapter = app.getHttpAdapter().getInstance();
  if (httpAdapter && typeof httpAdapter.set === 'function') {
    httpAdapter.set('trust proxy', 1);
  }

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

  // OpenAPI / Swagger Documentation (disabled in production for security)
  if (!isProd) {
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
  }

  // Enable graceful shutdown lifecycle hooks
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`🚀 InterviewAI API running on port ${port} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  if (!isProd) {
    logger.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  }
  logger.log(`🔍 Health check: http://localhost:${port}/health`);
}
await bootstrap();
