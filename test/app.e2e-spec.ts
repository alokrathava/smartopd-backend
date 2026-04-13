import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initApp, closeApp } from './helpers/app.setup';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
  }, 90000);

  afterAll(async () => {
    await closeApp();
  });

  it('/api/v1 (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
