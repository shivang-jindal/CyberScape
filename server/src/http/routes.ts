import { Router, type Request } from 'express';
import { z } from 'zod';

import {
  chatRequestSchema,
  catalogQuerySchema,
  shareLinkSchema,
  simulationRequestSchema,
  type CatalogQuery
} from '@cyberscape/shared';

import { asyncHandler, validateBody, validateQuery } from './middleware.js';
import { fetchBgpState } from '../providers/ripe.js';
import { workspaceStore } from '../store/workspaceStore.js';
import {
  analyticsSummary,
  capabilities,
  decodeShareLink,
  encodeShareLink,
  getEntityDetail,
  listEntities,
  respondToChat,
  simulate
} from '../domain/engine.js';

export const apiRouter = Router();

function queryOf(req: Request): CatalogQuery {
  return (req as Request & { validatedQuery: CatalogQuery }).validatedQuery;
}

apiRouter.get('/v1/version', (_req, res) => {
  res.json({ name: 'CyberScape', version: '1.0.0', apiVersion: 'v1' });
});

apiRouter.get('/v1/capabilities', (_req, res) => {
  res.json(capabilities());
});

apiRouter.get('/v1/catalog', validateQuery(catalogQuerySchema), (req, res) => {
  res.json(listEntities(queryOf(req)));
});

apiRouter.get('/v1/catalog/:id', (req, res, next) => {
  try {
    res.json(getEntityDetail(req.params.id ?? ''));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/v1/analytics/summary', (_req, res) => {
  res.json(analyticsSummary());
});

const bgpInput = z.object({ resource: z.string().trim().regex(/^(?:AS)?[0-9]{1,10}$/i), projectId: z.string().uuid().optional() });
apiRouter.post('/v1/network/bgp-state', validateBody(bgpInput), asyncHandler(async (req, res) => {
  const snapshot = await fetchBgpState(req.body.resource.toUpperCase().startsWith('AS') ? req.body.resource.toUpperCase() : `AS${req.body.resource}`);
  if (req.body.projectId) await workspaceStore.addRun(req.body.projectId, `RIPE RIS BGP observation: ${snapshot.resource}`, snapshot);
  res.status(201).json({ snapshot, saved: Boolean(req.body.projectId) });
}));

const projectInput = z.object({
  name: z.string().trim().min(1).max(100),
  seed: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).default('')
});

apiRouter.get('/v1/workspaces', asyncHandler(async (_req, res) => {
  res.json({ projects: await workspaceStore.list() });
}));

apiRouter.post('/v1/workspaces', validateBody(projectInput), asyncHandler(async (req, res) => {
  res.status(201).json({ project: await workspaceStore.create(req.body) });
}));

apiRouter.delete('/v1/workspaces/:id', asyncHandler(async (req, res) => {
  await workspaceStore.remove(req.params.id ?? '');
  res.status(204).end();
}));

apiRouter.post('/v1/workspaces/:id/runs', validateBody(simulationRequestSchema), asyncHandler(async (req, res) => {
  const result = simulate(req.body);
  const project = await workspaceStore.addRun(req.params.id ?? '', result.actionLabel, result);
  res.status(201).json({ project, result });
}));

apiRouter.post(
  '/v1/simulate',
  validateBody(simulationRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(simulate(req.body));
  })
);

apiRouter.post(
  '/v1/ai/chat',
  validateBody(chatRequestSchema),
  asyncHandler(async (req, res) => {
    res.json(respondToChat(req.body));
  })
);

apiRouter.post(
  '/v1/share-links',
  validateBody(shareLinkSchema),
  asyncHandler(async (req, res) => {
    const token = encodeShareLink(req.body);
    res.status(201).json({ token, path: `/?share=${token}` });
  })
);

apiRouter.get('/v1/share-links/:token', (req, res, next) => {
  try {
    res.json({ payload: decodeShareLink(req.params.token ?? '') });
  } catch (error) {
    next(error);
  }
});
