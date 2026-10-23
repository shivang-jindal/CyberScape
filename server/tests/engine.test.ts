import { describe, expect, it } from 'vitest';
import { ACTIONS, CATEGORIES, ENTITIES, analyticsSummarySchema, chatResponseSchema, entityDetailSchema, simulationResultSchema } from '@cyberscape/shared';

import {
  analyticsSummary,
  createRng,
  decodeShareLink,
  encodeShareLink,
  getEntityDetail,
  hashSeed,
  listEntities,
  respondToChat,
  riskScore,
  simulate
} from '../src/domain/engine.js';

const target = ENTITIES[0];
const action = ACTIONS[0];
if (!target || !action) throw new Error('Catalogue fixtures are missing');

describe('deterministic primitives', () => {
  it('hashes inputs stably', () => {
    expect(hashSeed('cyber-scape')).toBe(hashSeed('cyber-scape'));
    expect(hashSeed('seed-a')).not.toBe(hashSeed('seed-b'));
  });

  it('produces repeatable random sequences in [0, 1)', () => {
    const first = createRng(7);
    const second = createRng(7);
    const values = [first(), first(), first()];
    expect(values).toEqual([second(), second(), second()]);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('catalogue', () => {
  it('returns every entity with defaults', () => {
    const page = listEntities({ page: 1, pageSize: 100, sort: 'name' });
    expect(page.total).toBe(ENTITIES.length);
    expect(page.items).toHaveLength(ENTITIES.length);
    expect(page.pageCount).toBe(1);
  });

  it('filters by category and text', () => {
    const category = CATEGORIES[0];
    const filtered = listEntities({ category, page: 1, pageSize: 50, sort: 'name' });
    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.items.every((entity) => entity.category === category)).toBe(true);

    const search = listEntities({ q: target.name.split(' ')[0] ?? target.id, page: 1, pageSize: 50, sort: 'name' });
    expect(search.items.map((entity) => entity.id)).toContain(target.id);
  });

  it('paginates without losing entities', () => {
    const first = listEntities({ page: 1, pageSize: 5, sort: 'name' });
    const second = listEntities({ page: 2, pageSize: 5, sort: 'name' });
    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    expect(first.items.map((entity) => entity.id)).not.toEqual(second.items.map((entity) => entity.id));
    expect(second.page).toBe(2);
  });

  it('keeps risk scores in range', () => {
    for (const entity of ENTITIES) {
      const risk = riskScore(entity);
      expect(risk).toBeGreaterThanOrEqual(0);
      expect(risk).toBeLessThanOrEqual(100);
    }
  });
});

describe('entity detail', () => {
  it('returns twelve history points, a risk score, and related entities', () => {
    const detail = getEntityDetail(target.id);
    expect(entityDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.history).toHaveLength(12);
    expect(detail.related).toHaveLength(3);
    expect(detail.related.every((entity) => entity.id !== target.id)).toBe(true);
  });

  it('throws a typed 404 for unknown ids', () => {
    expect(() => getEntityDetail('missing-asset')).toThrowError(/No asset/);
  });
});

describe('analytics', () => {
  it('accounts for every entity exactly once', () => {
    const summary = analyticsSummary();
    expect(analyticsSummarySchema.safeParse(summary).success).toBe(true);
    const statusTotal = Object.values(summary.byStatus).reduce((sum, count) => sum + count, 0);
    const categoryTotal = Object.values(summary.byCategory).reduce((sum, count) => sum + count, 0);
    expect(statusTotal).toBe(ENTITIES.length);
    expect(categoryTotal).toBe(ENTITIES.length);
    expect(summary.topRisks).toHaveLength(5);
  });
});

describe('simulation', () => {
  const request = {
    action: action.id,
    targetId: target.id,
    intensity: 0.8,
    horizonHours: 24
  };

  it('is deterministic and schema valid', () => {
    const first = simulate(request);
    const second = simulate(request);
    expect(simulationResultSchema.safeParse(first).success).toBe(true);
    expect(second.impactScore).toBe(first.impactScore);
    expect(second.timeline).toEqual(first.timeline);
    expect(first.recommendations.length).toBeGreaterThan(0);
    expect(first.timeline).toHaveLength(7);
  });

  it('bounds availability and load percentages', () => {
    const result = simulate({ ...request, intensity: 1, horizonHours: 72 });
    for (const point of result.timeline) {
      expect(point.availability).toBeGreaterThanOrEqual(0);
      expect(point.availability).toBeLessThanOrEqual(100);
      expect(point.load).toBeGreaterThanOrEqual(0);
      expect(point.load).toBeLessThanOrEqual(100);
      expect(point.risk).toBeGreaterThanOrEqual(0);
      expect(point.risk).toBeLessThanOrEqual(100);
    }
  });

  it('rejects unknown targets', () => {
    expect(() => simulate({ ...request, targetId: 'not-real' })).toThrowError(/No asset/);
  });
});

describe('share links', () => {
  it('round-trips a valid payload', () => {
    const token = encodeShareLink({ entityId: target.id, category: target.category });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShareLink(token)).toEqual({ entityId: target.id, category: target.category });
  });

  it('rejects invalid tokens', () => {
    expect(() => decodeShareLink('garbage')).toThrowError(/not valid/);
  });
});

describe('assistant', () => {
  it('focuses a named entity', () => {
    const reply = respondToChat({ message: `Tell me about ${target.name}`, model: 'cyberscape-1' });
    expect(chatResponseSchema.safeParse(reply).success).toBe(true);
    expect(reply.message).toContain(target.name);
    expect(reply.actions.some((actionItem) => actionItem.type === 'focus_entity')).toBe(true);
  });

  it('explains the deterministic seed', () => {
    const reply = respondToChat({ message: 'How does the seed work?', model: 'cyberscape-1' });
    expect(reply.message.toLowerCase()).toContain('seed');
  });

  it('answers risk questions with ranked entities', () => {
    const reply = respondToChat({ message: 'Which assets are most at risk?', model: 'cyberscape-1' });
    expect(reply.message).toContain('/100');
    expect(reply.actions[0]?.type).toBe('open_page');
  });

  it('falls back with a summary for unknown intents', () => {
    const reply = respondToChat({ message: 'hello', model: 'cyberscape-1' });
    expect(reply.message).toContain('CyberScape');
    expect(reply.conversationId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
