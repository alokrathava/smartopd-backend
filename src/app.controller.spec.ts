import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    it('should return health and system info', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.app).toBe('SmartOPD API');
      expect(result.environment).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.nodeVersion).toBeDefined();
      expect(result.docs).toBe('/api/docs');
    });
  });
});
