import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const mockDataSource = {
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ version: 'PostgreSQL 17.11' }]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('operational');
        expect(res.body.name).toBe('InterviewAI API');
      });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('interviewai-api');
        expect(res.body.domains).toContain('sde');
        expect(res.body.domains).toContain('sap');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
