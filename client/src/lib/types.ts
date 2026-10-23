import type {
  AnalyticsSummary,
  CatalogEntity,
  ChatResponse,
  EntityDetail,
  SimulationResult,
  SimulationAction,
  CatalogMetric
} from '@cyberscape/shared';

export interface CatalogResponse {
  items: CatalogEntity[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface CapabilitiesResponse {
  product: string;
  tagline: string;
  entityLabel: string;
  entitySingular: string;
  categories: readonly string[];
  regions: readonly string[];
  statuses: readonly string[];
  metrics: CatalogMetric[];
  actions: SimulationAction[];
}

export interface ShareLinkResponse {
  token: string;
  path: string;
}

export interface ShareLinkPayload {
  entityId?: string;
  category?: string;
  q?: string;
  page?: number;
}

export interface VersionResponse {
  name: string;
  version: string;
  apiVersion: string;
}

export interface HealthResponse {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
}

export type { AnalyticsSummary, CatalogEntity, ChatResponse, EntityDetail, SimulationResult };
