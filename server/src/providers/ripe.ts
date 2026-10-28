import { z } from 'zod';

const routeSchema = z.object({
  target_prefix: z.string().optional(),
  path: z.array(z.union([z.string(), z.number()])).optional().default([]),
  source_id: z.string().optional()
}).passthrough();

const responseSchema = z.object({
  data: z.object({
    resource: z.string().optional(),
    query_time: z.string().optional(),
    nr_routes: z.number().int().nonnegative().optional(),
    bgp_state: z.array(routeSchema).default([])
  }).passthrough()
}).passthrough();
const overviewSchema = z.object({ data: z.object({ resource: z.string().optional(), holder: z.string().optional(), announced: z.boolean().optional(), asn: z.object({ name: z.string().optional(), country: z.string().optional(), registry: z.string().optional() }).optional() }).passthrough() }).passthrough();

export interface BgpRouteSample {
  prefix: string | null;
  path: string[];
  peer: string | null;
  originAs: string | null;
}

export interface BgpSnapshot {
  resource: string;
  observedAt: string | null;
  fetchedAt: string;
  routeCount: number;
  sampledRoutes: number;
  uniquePrefixes: number;
  originCounts: Array<{ asn: string; routes: number }>;
  peerCounts: Array<{ peer: string; routes: number }>;
  routes: BgpRouteSample[];
  source: { name: string; url: string; coverage: string };
  registry: { holder: string | null; announced: boolean | null; country: string | null; registry: string | null } | null;
}

const endpoint = 'https://stat.ripe.net/data/bgp-state/data.json';
const sourceInfo = {
  name: 'RIPE NCC RIPE RIS BGP State API',
  url: 'https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state.html',
  coverage: 'Routes observed by RIPE RIS collectors; collector visibility is partial and does not represent every network.'
};

export async function fetchBgpState(resource: string): Promise<BgpSnapshot> {
  const url = new URL(endpoint);
  url.searchParams.set('resource', resource);
  url.searchParams.set('sourceapp', 'cyberscape-resilience-workbench');
  const overviewUrl = new URL('https://stat.ripe.net/data/as-overview/data.json');
  overviewUrl.searchParams.set('resource', resource);
  overviewUrl.searchParams.set('sourceapp', 'cyberscape-resilience-workbench');
  const overviewPromise = fetch(overviewUrl, { signal: AbortSignal.timeout(8_000), redirect: 'error', headers: { accept: 'application/json' } })
    .then(async (response) => response.ok ? overviewSchema.safeParse(await response.json()) : null)
    .catch(() => null);
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error', headers: { accept: 'application/json' } });
  } catch (error) {
    const failure = new Error(error instanceof Error && error.name === 'TimeoutError' ? 'RIPE RIS request timed out.' : 'RIPE RIS could not be reached.') as Error & { statusCode: number; code: string };
    failure.statusCode = 503;
    failure.code = 'BGP_PROVIDER_UNAVAILABLE';
    throw failure;
  }
  if (!response.ok) {
    const failure = new Error(`RIPE RIS returned HTTP ${response.status}.`) as Error & { statusCode: number; code: string };
    failure.statusCode = 502;
    failure.code = 'BGP_PROVIDER_ERROR';
    throw failure;
  }
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > 8_000_000) throw Object.assign(new Error('RIPE RIS response exceeded the 8 MB safety limit.'), { statusCode: 502, code: 'BGP_RESPONSE_TOO_LARGE' });
  const raw = await response.text();
  if (raw.length > 8_000_000) throw Object.assign(new Error('RIPE RIS response exceeded the 8 MB safety limit.'), { statusCode: 502, code: 'BGP_RESPONSE_TOO_LARGE' });
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch { throw Object.assign(new Error('RIPE RIS returned invalid JSON.'), { statusCode: 502, code: 'BGP_INVALID_RESPONSE' }); }
  const parsed = responseSchema.safeParse(parsedJson);
  if (!parsed.success) throw Object.assign(new Error('RIPE RIS response did not match the documented route format.'), { statusCode: 502, code: 'BGP_INVALID_RESPONSE' });

  const data = parsed.data.data;
  const overview = await overviewPromise;
  const routes: BgpRouteSample[] = data.bgp_state.slice(0, 250).map((route) => {
    const path = route.path.map(String);
    return { prefix: route.target_prefix ?? null, path, peer: route.source_id ?? path[0] ?? null, originAs: path.at(-1) ?? null };
  });
  const countOrigins = () => {
    const counts = new Map<string, number>();
    for (const route of data.bgp_state) {
      const value = route.path.at(-1);
      if (value !== undefined) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
    }
    return [...counts.entries()].map(([asn, routes]) => ({ asn, routes })).sort((a, b) => b.routes - a.routes).slice(0, 12);
  };
  const countPeers = () => {
    const counts = new Map<string, number>();
    for (const route of data.bgp_state) {
      const value = route.source_id ?? route.path[0];
      if (value !== undefined) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
    }
    return [...counts.entries()].map(([peer, routes]) => ({ peer, routes })).sort((a, b) => b.routes - a.routes).slice(0, 12);
  };
  const allPrefixes = new Set(data.bgp_state.flatMap((route) => route.target_prefix ? [route.target_prefix] : []));
  return {
    resource: data.resource ?? resource,
    observedAt: data.query_time ?? null,
    fetchedAt: new Date().toISOString(),
    routeCount: data.nr_routes ?? data.bgp_state.length,
    sampledRoutes: data.bgp_state.length,
    uniquePrefixes: allPrefixes.size,
    originCounts: countOrigins(),
    peerCounts: countPeers(),
    routes,
    source: sourceInfo,
    registry: overview?.success ? {
      holder: overview.data.data.holder ?? overview.data.data.asn?.name ?? null,
      announced: overview.data.data.announced ?? null,
      country: overview.data.data.asn?.country ?? null,
      registry: overview.data.data.asn?.registry ?? null
    } : null
  };
}
