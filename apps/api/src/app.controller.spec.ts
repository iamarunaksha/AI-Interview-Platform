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

    it('should always return 200 ok for liveness probe', () => {
      const live = appController.getLiveness();
      expect(live.status).toBe('ok');
      expect(live.timestamp).toBeTruthy();
    });

    it('should set 503 status on readiness probe when database is disconnected', async () => {
      mockDataSource.query = vi
        .fn()
        .mockRejectedValueOnce(new Error('Connection refused'));
      const mockRes = { status: vi.fn() } as any;

      const health = await appController.getReadiness(mockRes);
      expect(health.status).toBe('degraded');
      expect(health.database.status).toBe('disconnected');
      expect(mockRes.status).toHaveBeenCalledWith(503);
    });
  });
});
