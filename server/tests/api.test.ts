import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { ACTIONS, ENTITIES } from '@cyberscape/shared';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/logger.js';

const config = loadConfig({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4200',
  CORS_ORIGIN: 'http://localhost:5173'
} as NodeJS.ProcessEnv);
const logger = createLogger(config);
const app = createApp({ config, logger });

const first = ENTITIES[0];
if (!first) throw new Error('Catalogue fixture is missing');

describe('service metadata', () => {
  it('reports health and version', async () => {
    const health = await request(app).get('/health').expect(200);
    expect(health.body.status).toBe('ok');

    const version = await request(app).get('/api/v1/version').expect(200);
    expect(version.body).toMatchObject({ name: 'CyberScape', version: '1.0.0', apiVersion: 'v1' });
  });

  it('exposes capabilities driven by the shared catalogue', async () => {
    const response = await request(app).get('/api/v1/capabilities').expect(200);
    expect(response.body.entityLabel).toBe('assets');
    expect(response.body.categories.length).toBeGreaterThan(3);
    expect(response.body.actions.length).toBe(6);
  });
});

describe('catalogue API', () => {
  it('lists the catalogue', async () => {
    const response = await request(app).get('/api/v1/catalog').expect(200);
    expect(response.body.total).toBe(ENTITIES.length);
    expect(response.body.items[0]).toEqual(expect.objectContaining({ id: expect.any(String) }));
  });

  it('filters by category and query text', async () => {
    const category = encodeURIComponent(first.category);
    const response = await request(app).get(`/api/v1/catalog?category=${category}&pageSize=50`).expect(200);
    expect(response.body.items.every((entity: { category: string }) => entity.category === first.category)).toBe(true);

    const search = await request(app).get(`/api/v1/catalog?q=${encodeURIComponent(first.tags[0] ?? first.name)}`).expect(200);
    expect(search.body.total).toBeGreaterThan(0);
  });

  it('rejects an unknown category', async () => {
    const response = await request(app).get('/api/v1/catalog?category=Moon').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a detail with history and related assets', async () => {
    const response = await request(app).get(`/api/v1/catalog/${first.id}`).expect(200);
    expect(response.body.entity.name).toBe(first.name);
    expect(response.body.history).toHaveLength(12);
    expect(response.body.related).toHaveLength(3);
  });

  it('returns a typed 404 for an unknown id', async () => {
    const response = await request(app).get('/api/v1/catalog/nope').expect(404);
    expect(response.body.error.code).toBe('ENTITY_NOT_FOUND');
  });

  it('reports analytics', async () => {
    const response = await request(app).get('/api/v1/analytics/summary').expect(200);
    expect(response.body.total).toBe(ENTITIES.length);
    expect(response.body.topRisks).toHaveLength(5);
  });
});

describe('simulation API', () => {
  const body = {
    action: ACTIONS[1]?.id ?? ACTIONS[0]?.id ?? 'cable_cut',
    targetId: first.id,
    intensity: 0.7,
    horizonHours: 24
  };

  it('creates a deterministic simulation', async () => {
    const firstRun = await request(app).post('/api/v1/simulate').send(body).expect(201);
    const secondRun = await request(app).post('/api/v1/simulate').send(body).expect(201);
    expect(firstRun.body.timeline).toEqual(secondRun.body.timeline);
    expect(firstRun.body.impactScore).toBeGreaterThan(0);
    expect(firstRun.body.recommendations.length).toBeGreaterThan(0);
  });

  it('rejects an unknown action', async () => {
    const response = await request(app)
      .post('/api/v1/simulate')
      .send({ ...body, action: 'supernova' })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an out-of-range intensity', async () => {
    const response = await request(app).post('/api/v1/simulate').send({ ...body, intensity: 3 }).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('persists a seeded study and its simulation report', async () => {
    const created = await request(app).post('/api/v1/workspaces')
      .send({ name: 'Repeatable study', seed: 'study-seed-42', notes: 'Keep assumptions with the result.' }).expect(201);
    const projectId = created.body.project.id as string;
    const saved = await request(app).post(`/api/v1/workspaces/${projectId}/runs`)
      .send({ ...body, seed: 'study-seed-42' }).expect(201);
    expect(saved.body.project.runs).toHaveLength(1);
    expect(saved.body.result.seed).toBe('study-seed-42');
    const listed = await request(app).get('/api/v1/workspaces').expect(200);
    expect(listed.body.projects.find((item: { id: string }) => item.id === projectId).runs[0].result.seed).toBe('study-seed-42');
    await request(app).delete(`/api/v1/workspaces/${projectId}`).expect(204);
  });
});

describe('assistant API', () => {
  it('answers with actions', async () => {
    const response = await request(app)
      .post('/api/v1/ai/chat')
      .send({ message: `Tell me about ${first.name}` })
      .expect(200);
    expect(response.body.message).toContain(first.name);
    expect(response.body.actions.length).toBeGreaterThan(0);
  });

  it('requires a non-empty message', async () => {
    const response = await request(app).post('/api/v1/ai/chat').send({ message: '   ' }).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('share links', () => {
  it('creates and decodes a share link', async () => {
    const created = await request(app)
      .post('/api/v1/share-links')
      .send({ entityId: first.id, category: first.category })
      .expect(201);
    expect(created.body.token).toBeTruthy();

    const decoded = await request(app).get(`/api/v1/share-links/${created.body.token}`).expect(200);
    expect(decoded.body.payload).toMatchObject({ entityId: first.id });
  });

  it('rejects an invalid token', async () => {
    const response = await request(app).get('/api/v1/share-links/not-a-token').expect(400);
    expect(response.body.error.code).toBe('INVALID_SHARE_LINK');
  });
});

describe('unknown routes', () => {
  it('returns a structured 404', async () => {
    const response = await request(app).get('/api/v1/nope').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
