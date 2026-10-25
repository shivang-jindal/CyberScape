import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Compass,
  Cpu,
  Database,
  Gauge,
  Globe2,
  Layers,
  ShieldAlert,
  Sparkles,
  Waypoints
} from 'lucide-react';

import { ACTIONS, CATEGORIES, METRICS, PIPELINE, PRODUCT, STATUSES } from '@cyberscape/shared';

import { SeedStudio } from '../components/SeedStudio';
import { Sparkline } from '../components/Sparkline';
import { WorldCard } from '../components/WorldCard';
import { useToast } from '../components/Toast';
import { ErrorNote, Panel, SectionHeading, Spinner, StatCard } from '../components/ui';
import { apiGet, buildQuery } from '../lib/api';
import { cx, formatNumber } from '../lib/format';
import type { AnalyticsSummary, CatalogResponse, ShareLinkPayload } from '../lib/types';
import { useAppStore } from '../store/appStore';

const PIPELINE_ICONS = {
  cpu: Cpu,
  waypoints: Waypoints,
  gauge: Gauge,
  shield: ShieldAlert,
  activity: Activity
} as const;

export function OverviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToast } = useToast();
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const density = useAppStore((state) => state.density);
  const handledShare = useRef(false);

  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiGet<AnalyticsSummary>('/analytics/summary')
  });

  const featured = useQuery({
    queryKey: ['catalog', 'overview'],
    queryFn: () => apiGet<CatalogResponse>(`/catalog${buildQuery({ sort: 'risk', pageSize: 4 })}`)
  });

  useEffect(() => {
    const token = params.get('share');
    if (!token || handledShare.current) return;
    handledShare.current = true;
    apiGet<{ payload: ShareLinkPayload }>(`/share-links/${encodeURIComponent(token)}`)
      .then(({ payload }) => {
        const next = new URLSearchParams();
        if (payload.entityId) next.set('entity', payload.entityId);
        if (payload.category) next.set('category', payload.category);
        if (payload.q) next.set('q', payload.q);
        navigate(`/catalog?${next.toString()}`, { replace: true });
      })
      .catch(() => {
        addToast({ type: 'warning', title: 'Share link could not be opened', message: 'The token is invalid or expired.' });
        navigate('/', { replace: true });
      });
  }, [params, navigate, addToast]);

  const summary = analytics.data;
  const categoryRows = summary
    ? Object.entries(summary.byCategory)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  const riskHistory = summary?.topRisks.map((item) => item.risk) ?? [];
  const criticalStatus = STATUSES[STATUSES.length - 1] ?? 'critical';
  const criticalLabel = criticalStatus.charAt(0).toUpperCase() + criticalStatus.slice(1);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-brand-400/30 bg-brand-400/10 text-brand-200">
                <Sparkles className="h-3 w-3" />
                {PRODUCT.engineLabel}
              </span>
              <span className="chip">v1.0 · {PRODUCT.scopeLine}</span>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {PRODUCT.heroTitle}
              <span className="block bg-gradient-to-r from-brand-200 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                {PRODUCT.heroAccent}
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">{PRODUCT.heroBody}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link to="/catalog" className="btn btn-primary">
                <Compass className="h-4 w-4" />
                Explore the {PRODUCT.catalogueName.toLowerCase()}
              </Link>
              <Link to="/simulator" className="btn">
                <BrainCircuit className="h-4 w-4" />
                Open simulation lab
              </Link>
              <Link to="/assistant" className="btn btn-ghost">
                Ask the {PRODUCT.assistantName}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Seed primitives', value: 'FNV-1a', hint: '32-bit, platform-stable' },
                { label: 'PRNG', value: 'Mulberry32', hint: 'no external entropy' },
                { label: 'Database', value: 'None', hint: 'pure functions only' },
                { label: 'API surface', value: '/api/v1', hint: 'Zod-validated' }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-surface-sunken/70 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{item.label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-brand-200">{item.value}</p>
                  <p className="text-[10px] text-ink-faint">{item.hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-surface-sunken/70 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">risk curve</span>
              <div className="w-32">
                <Sparkline values={riskHistory.length > 1 ? riskHistory : [20, 40, 30, 60, 48, 72]} height={30} label="Portfolio risk curve" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SeedStudio />

      {analytics.isError ? <ErrorNote message={(analytics.error as Error).message} onRetry={() => analytics.refetch()} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary ? (
          <>
            <StatCard
              label={`${PRODUCT.entityLabelTitle} tracked`}
              value={summary.total}
              hint={`${categoryRows.length} of ${CATEGORIES.length} categories active`}
              icon={<Globe2 className="h-4 w-4" />}
            />
            <StatCard
              label="Average risk"
              value={`${summary.averageRisk}`}
              hint={`0–100, deterministic per ${PRODUCT.entitySingular}`}
              icon={<ShieldAlert className="h-4 w-4" />}
              tone="text-amber-300"
            />
            <StatCard
              label={criticalLabel}
              value={summary.byStatus[criticalStatus] ?? 0}
              hint="Require a simulation before promotion"
              icon={<Sparkles className="h-4 w-4" />}
              tone="text-rose-300"
            />
            <StatCard
              label="Categories"
              value={categoryRows.length}
              hint={`Across ${CATEGORIES.length} tracked categories`}
              icon={<Layers className="h-4 w-4" />}
              tone="text-sky-300"
            />
          </>
        ) : analytics.isPending ? (
          <div className="card col-span-full">
            <Spinner label={`Reading ${PRODUCT.catalogueName.toLowerCase()}…`} />
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title={`Highest-risk ${PRODUCT.entityLabel}`}
          description="Ranked by deterministic risk score. Open a dossier before running an intervention."
          actions={
            <Link to="/catalog?sort=risk" className="btn btn-ghost text-xs">
              Full ranking
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {summary ? (
            <ul className="space-y-2">
              {summary.topRisks.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/catalog?entity=${encodeURIComponent(item.id)}`)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 text-left transition-colors hover:border-brand-400/40"
                  >
                    <span className="w-5 font-mono text-[11px] text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{item.name}</span>
                        <span className="text-[10px] text-ink-faint">{item.category}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <span
                            className={cx('block h-full rounded-full', item.risk >= 70 ? 'bg-rose-400' : item.risk >= 45 ? 'bg-amber-400' : 'bg-brand-400')}
                            style={{ width: `${item.risk}%` }}
                          />
                        </span>
                        <span className="w-8 text-right font-mono text-[11px] text-ink-muted">{Math.round(item.risk)}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-300" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Spinner />
          )}
        </Panel>

        <Panel title="Category distribution" description="How the current atlas is composed.">
          {summary ? (
            <ul className="space-y-2.5">
              {categoryRows.map(([category, count]) => (
                <li key={category}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">{category}</span>
                    <span className="font-mono text-ink-faint">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300"
                      style={{ width: `${(count / Math.max(1, summary.total)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Spinner />
          )}
          <div className="mt-4 rounded-lg border border-line bg-surface-sunken/60 p-2.5 text-[11px] text-ink-muted">
            <span className="font-semibold text-ink">{formatNumber(summary?.total ?? 0)}</span> {PRODUCT.entityLabel} ·{' '}
            <span className="font-semibold text-ink">{METRICS.length}</span> comparable metrics ·{' '}
            <span className="font-semibold text-ink">{ACTIONS.length}</span> interventions
          </div>
        </Panel>
      </div>

      <section>
        <SectionHeading
          eyebrow="Catalogue signal"
          title={`Risk-ranked ${PRODUCT.entityLabel} to inspect`}
          description={`Open a dossier for metrics, history, seed fingerprint, and related ${PRODUCT.entityLabel}.`}
          actions={
            <Link to="/catalog" className="btn text-xs">
              All {PRODUCT.entityLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {featured.isPending ? (
          <div className="card mt-4">
            <Spinner />
          </div>
        ) : featured.isError ? (
          <div className="mt-4">
            <ErrorNote message={(featured.error as Error).message} onRetry={() => featured.refetch()} />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {featured.data?.items.map((entity) => (
              <WorldCard
                key={entity.id}
                entity={entity}
                risk={summary?.topRisks.find((item) => item.id === entity.id)?.risk ?? 30}
                density={density}
                favorite={favoriteIds.includes(entity.id)}
                compared={false}
                compareDisabled={false}
                onOpen={() => navigate(`/catalog?entity=${encodeURIComponent(entity.id)}`)}
                onToggleFavorite={() => toggleFavorite(entity.id)}
                onToggleCompare={() => navigate(`/catalog?compare=${encodeURIComponent(entity.id)}`)}
              />
            ))}
          </div>
        )}
      </section>

      <Panel title="The determinism pipeline" description="Every layer is a pure function of the one above it.">
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {PIPELINE.map((step, index) => {
            const Icon = PIPELINE_ICONS[step.icon] ?? Cpu;
            return (
              <li key={step.title} className="relative rounded-xl border border-line bg-surface-sunken/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-400/10 text-brand-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">0{index + 1}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-surface-sunken/60 p-3 text-[11px] text-ink-muted">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
          The catalogue is in-memory and versioned in source. Fork the repository to add {PRODUCT.entityLabel} without
          changing the engine, or call the API headlessly from your own pipeline.
        </div>
      </Panel>
    </div>
  );
}
