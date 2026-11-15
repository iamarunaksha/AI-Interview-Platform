import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  const mockDataSource = {
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ version: 'PostgreSQL 17.11' }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return operational status', () => {
      expect(appController.getRoot()).toEqual({
        name: 'InterviewAI API',
        status: 'operational',
      });
    });

    it('should return health check details with connected database', async () => {
      const health = await appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('interviewai-api');
      expect(health.database.status).toBe('connected');
      expect(health.database.version).toBe('PostgreSQL 17.11');
      expect(health.domains).toContain('sde');
      expect(health.domains).toContain('sap');
    });
  });
});
