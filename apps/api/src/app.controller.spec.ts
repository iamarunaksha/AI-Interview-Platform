import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
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

    it('should return health check details', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('interviewai-api');
      expect(health.domains).toContain('sde');
      expect(health.domains).toContain('sap');
    });
  });
});
