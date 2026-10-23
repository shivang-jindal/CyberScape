import { z } from 'zod';

import { ACTION_IDS, CATEGORIES, REGIONS, STATUSES } from './constants.js';

export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  region: z.enum(REGIONS),
  status: z.enum(STATUSES),
  summary: z.string().min(1),
  metrics: z.record(z.number()),
  tags: z.array(z.string())
});

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
  region: z.enum(REGIONS).optional(),
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  sort: z.enum(['name', 'risk']).default('name')
});

export const entityDetailSchema = z.object({
  entity: entitySchema,
  riskScore: z.number().min(0).max(100),
  history: z.array(
    z.object({
      period: z.string(),
      value: z.number()
    })
  ),
  related: z.array(entitySchema)
});

export const simulationRequestSchema = z.object({
  action: z.enum(ACTION_IDS),
  targetId: z.string().min(1).max(120),
  intensity: z.number().min(0).max(1).default(0.5),
  horizonHours: z.number().int().min(1).max(72).default(24)
});

export const simulationResultSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  actionLabel: z.string(),
  targetId: z.string(),
  targetName: z.string(),
  impactScore: z.number().min(0).max(100),
  affected: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical'])
    })
  ),
  timeline: z.array(
    z.object({
      hour: z.number().int().min(0),
      availability: z.number().min(0).max(100),
      load: z.number().min(0).max(100),
      risk: z.number().min(0).max(100)
    })
  ),
  recommendations: z.array(z.string()),
  createdAt: z.string()
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(600),
  conversationId: z.string().uuid().optional(),
  model: z.string().max(60).default('cyberscape-1')
});

export const chatActionSchema = z.object({
  type: z.enum(['focus_entity', 'open_page', 'run_simulation', 'answer']),
  label: z.string(),
  params: z.record(z.unknown()).default({})
});

export const chatResponseSchema = z.object({
  message: z.string(),
  conversationId: z.string().uuid(),
  actions: z.array(chatActionSchema),
  metadata: z.object({
    model: z.string(),
    tokensUsed: z.number().int().nonnegative(),
    latencyMs: z.number().int().nonnegative()
  })
});

export const shareLinkSchema = z.object({
  entityId: z.string().min(1).optional(),
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).optional()
});

export const analyticsSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.record(z.number().int().nonnegative()),
  byCategory: z.record(z.number().int().nonnegative()),
  averageRisk: z.number().min(0).max(100),
  topRisks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      risk: z.number().min(0).max(100)
    })
  )
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type EntityDetail = z.infer<typeof entityDetailSchema>;
export type SimulationRequest = z.infer<typeof simulationRequestSchema>;
export type SimulationResult = z.infer<typeof simulationResultSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ShareLink = z.infer<typeof shareLinkSchema>;
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
