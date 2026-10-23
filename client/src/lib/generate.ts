import {
  CATEGORIES,
  METRICS,
  PREVIEW_NAME_PARTS,
  REGIONS,
  STATUSES,
  STATUS_RISK,
  type Category,
  type EntityStatus,
  type Region
} from '@cyberscape/shared';

/** FNV-1a. Mirrors the server so a seed fingerprints identically everywhere. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 is compact, fast, and stable across platforms. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedPreview {
  seed: string;
  hash: number;
  hex: string;
  name: string;
  category: Category;
  region: Region;
  status: EntityStatus;
  metrics: Record<string, number>;
  risk: number;
  land: number;
}

function pick<T>(items: readonly T[], rng: () => number): T {
  const index = Math.floor(rng() * items.length);
  return items[index] ?? items[0]!;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function metricValue(max: number, format: 'number' | 'percent' | 'compact', rng: () => number): number {
  const floor = format === 'percent' ? 5 : Math.max(1, max * 0.06);
  const raw = floor + rng() * Math.max(1, max - floor) * 0.94;
  return round(raw, max <= 100 ? 1 : 0);
}

/**
 * Client-side preview of an entity from a seed. The catalogue is server-owned,
 * but this preview makes the determinism visible before you commit a seed.
 */
export function previewSeed(rawSeed: string): SeedPreview {
  const seed = rawSeed.trim() || 'uncharted';
  const hash = hashSeed(seed);
  const rng = createRng(hash);

  const category = pick(CATEGORIES, rng);
  const region = pick(REGIONS, rng);
  const status = pick(STATUSES, rng);
  const name = `${pick(PREVIEW_NAME_PARTS.prefixes, rng)} ${pick(PREVIEW_NAME_PARTS.suffixes, rng)}`;

  const metrics: Record<string, number> = {};
  for (const metric of METRICS) {
    const max = metric.max ?? (metric.format === 'percent' ? 100 : 100);
    metrics[metric.key] = metricValue(max, metric.format, rng);
  }

  const baseRisk = STATUS_RISK[status] ?? 18;
  const risk = round(Math.min(100, Math.max(0, baseRisk + rng() * 20 - 10)));

  return {
    seed,
    hash,
    hex: `0x${hash.toString(16).toUpperCase().padStart(8, '0')}`,
    name,
    category,
    region,
    status,
    metrics,
    risk,
    land: rng()
  };
}

/** Mirrors the server risk formula so list and dossier agree without a request. */
export function riskScoreFor(entity: { id: string; status: string }): number {
  const base = STATUS_RISK[entity.status as EntityStatus] ?? 18;
  return Math.round((base + (hashSeed(entity.id) % 100) / 5 - 10) * 10) / 10;
}
