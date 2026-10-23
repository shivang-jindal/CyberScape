import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Filter,
  GitCompareArrows,
  Grid2X2,
  Heart,
  List,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  X
} from 'lucide-react';

import {
  CATEGORIES,
  METRICS,
  PRODUCT,
  REGIONS,
  STATUSES,
  type CatalogEntity
} from '@cyberscape/shared';

import { WorldCard } from '../components/WorldCard';
import { WorldDetailDrawer } from '../components/WorldDetailDrawer';
import { useToast } from '../components/Toast';
import { EmptyState, ErrorNote, MetricBar, RiskMeter, Segmented, Spinner, StatusBadge } from '../components/ui';
import { apiGet, apiPost, buildQuery } from '../lib/api';
import { copyText, cx, downloadJson, formatNumber, riskBand } from '../lib/format';
import { riskScoreFor } from '../lib/generate';
import type { CatalogResponse, ShareLinkResponse } from '../lib/types';
import { useAppStore } from '../store/appStore';

const PAGE_SIZE = 12;

function validValue<T extends string>(value: string | null, options: readonly T[]): T | '' {
  if (!value) return '';
  return options.includes(value as T) ? (value as T) : '';
}

export function CatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const resetFilters = useAppStore((state) => state.resetFilters);
  const density = useAppStore((state) => state.density);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const initialized = useRef(false);
  const compareParam = searchParams.get('compare');
  const entityId = searchParams.get('entity');

  const deferredQuery = useDeferredValue(filters.q);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const next = {
      q: searchParams.get('q') ?? '',
      category: validValue(searchParams.get('category'), CATEGORIES),
      region: validValue(searchParams.get('region'), REGIONS),
      status: validValue(searchParams.get('status'), STATUSES),
      sort: searchParams.get('sort') === 'risk' ? ('risk' as const) : ('name' as const)
    };
    if (next.q || next.category || next.region || next.status || next.sort === 'risk') setFilters(next);
    const requestedPage = Number(searchParams.get('page') ?? '1');
    if (Number.isFinite(requestedPage) && requestedPage > 0) setPage(Math.floor(requestedPage));
    // URL is only read once; subsequent changes are intentionally local + shareable.
  }, []);

  useEffect(() => {
    if (!compareParam) return;
    setCompareIds((current) => (current.includes(compareParam) || current.length >= 3 ? current : [...current, compareParam]));
  }, [compareParam]);

  const catalog = useQuery({
    queryKey: ['catalog', 'list', deferredQuery, filters.category, filters.region, filters.status, filters.sort, page],
    queryFn: () =>
      apiGet<CatalogResponse>(
        `/catalog${buildQuery({
          q: deferredQuery,
          category: filters.category,
          region: filters.region,
          status: filters.status,
          sort: filters.sort,
          page,
          pageSize: PAGE_SIZE
        })}`
      ),
    placeholderData: (previous) => previous
  });

  const allWorlds = useQuery({
    queryKey: ['catalog', 'all'],
    queryFn: () => apiGet<CatalogResponse>(`/catalog${buildQuery({ pageSize: 100, sort: 'name' })}`),
    enabled: compareIds.length > 0,
    staleTime: 60_000
  });

  const share = useMutation({
    mutationFn: () =>
      apiPost<ShareLinkResponse>('/share-links', {
        entityId: entityId ?? undefined,
        category: filters.category || undefined,
        q: filters.q || undefined,
        page
      }),
    onSuccess: async (data) => {
      const url = `${window.location.origin}/?share=${encodeURIComponent(data.token)}`;
      const ok = await copyText(url);
      addToast({
        type: ok ? 'success' : 'info',
        title: ok ? 'Share link copied' : 'Share link created',
        message: ok ? 'The current view is encoded in the link.' : url
      });
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Could not create link', message: error.message })
  });

  useEffect(() => {
    if (catalog.data && page > Math.max(1, catalog.data.pageCount)) {
      setPage(Math.max(1, catalog.data.pageCount));
    }
  }, [catalog.data, page]);

  const compareWorlds = useMemo(
    () => compareIds.map((id) => allWorlds.data?.items.find((entity) => entity.id === id)).filter((entity): entity is CatalogEntity => Boolean(entity)),
    [compareIds, allWorlds.data]
  );

  function updateFilter(patch: Partial<typeof filters>) {
    setFilters(patch);
    setPage(1);
  }

  function updateUrlForShareView() {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    if (filters.category) next.set('category', filters.category);
    if (filters.region) next.set('region', filters.region);
    if (filters.status) next.set('status', filters.status);
    if (filters.sort !== 'name') next.set('sort', filters.sort);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }

  function closeEntity() {
    const next = new URLSearchParams(searchParams);
    next.delete('entity');
    setSearchParams(next, { replace: true });
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) {
        addToast({ type: 'info', title: 'Comparison is full', message: `Remove ${PRODUCT.entityArticle} ${PRODUCT.entitySingular} to add another (maximum 3).` });
        return current;
      }
      return [...current, id];
    });
  }

  const visibleItems = (catalog.data?.items ?? []).filter((entity) => !favoritesOnly || favoriteIds.includes(entity.id));
  const totalPages = Math.max(1, catalog.data?.pageCount ?? 1);
  const tracked = METRICS[1] ?? METRICS[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">{PRODUCT.catalogueName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Every tracked {PRODUCT.entitySingular}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
            Filter by category, region, or lifecycle status. Open a dossier to inspect its metrics, history, seed
            fingerprint, and related {PRODUCT.entityLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => updateUrlForShareView()} className="btn text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Sync view to URL
          </button>
          <button type="button" onClick={() => share.mutate()} disabled={share.isPending} className="btn text-xs">
            <Share2 className="h-3.5 w-3.5" />
            {share.isPending ? 'Encoding…' : 'Share view'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!catalog.data) return;
              downloadJson(`${PRODUCT.repo.toLowerCase()}-catalog.json`, catalog.data);
              addToast({
                type: 'success',
                title: 'Catalogue exported',
                message: `${catalog.data.items.length} ${PRODUCT.entityLabel} written to JSON.`
              });
            }}
            disabled={!catalog.data}
            className="btn btn-primary text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="grid gap-2 md:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
          <div>
            <label className="label" htmlFor="catalog-search">
              Search
            </label>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                id="catalog-search"
                value={filters.q}
                onChange={(event) => updateFilter({ q: event.target.value })}
                placeholder="Name, category, tag…"
                className="input pl-8"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              value={filters.category}
              onChange={(event) => updateFilter({ category: event.target.value })}
              className="select"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-region">
              Region
            </label>
            <select
              id="filter-region"
              value={filters.region}
              onChange={(event) => updateFilter({ region: event.target.value })}
              className="select"
            >
              <option value="">All regions</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(event) => updateFilter({ status: event.target.value })}
              className="select"
            >
              <option value="">Any status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="filter-sort">
                Sort
              </label>
              <select
                id="filter-sort"
                value={filters.sort}
                onChange={(event) => updateFilter({ sort: event.target.value === 'risk' ? 'risk' : 'name' })}
                className="select"
              >
                <option value="name">A → Z</option>
                <option value="risk">Risk</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setFavoritesOnly(false);
                setPage(1);
                navigate('/catalog');
              }}
              className="btn px-2.5"
              aria-label="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              aria-pressed={favoritesOnly}
              className={cx('btn text-xs', favoritesOnly && 'border-rose-400/40 bg-rose-400/10 text-rose-200')}
            >
              <Heart className={cx('h-3.5 w-3.5', favoritesOnly && 'fill-current')} />
              Favourites {favoriteIds.length > 0 ? `(${favoriteIds.length})` : ''}
            </button>
            <Segmented
              value={layout}
              onChange={setLayout}
              label="Layout"
              options={[
                { value: 'grid', label: 'Grid', icon: <Grid2X2 className="h-3.5 w-3.5" /> },
                { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" /> }
              ]}
            />
          </div>
          <p className="text-[11px] text-ink-faint">
            {catalog.data ? (
              <>
                <span className="font-semibold text-ink">{catalog.data.total}</span> {PRODUCT.entityLabel} · page{' '}
                {catalog.data.page} of {totalPages}
              </>
            ) : (
              'Reading catalogue…'
            )}
            {deferredQuery !== filters.q ? ' · searching…' : ''}
          </p>
        </div>
      </div>

      {compareIds.length > 0 ? (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
            <GitCompareArrows className="h-4 w-4 text-brand-300" />
            Comparing {compareIds.length}/3
          </span>
          <div className="flex flex-wrap gap-1.5">
            {compareWorlds.map((entity) => (
              <span key={entity.id} className="chip">
                {entity.name}
                <button
                  type="button"
                  onClick={() => setCompareIds((current) => current.filter((value) => value !== entity.id))}
                  aria-label={`Remove ${entity.name} from comparison`}
                  className="text-ink-faint hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
            <button type="button" onClick={() => setCompareOpen(true)} disabled={compareIds.length < 2} className="btn btn-primary text-xs">
              Compare
            </button>
            <button type="button" onClick={() => setCompareIds([])} className="btn text-xs">
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {catalog.isError ? <ErrorNote message={(catalog.error as Error).message} onRetry={() => catalog.refetch()} /> : null}

      {catalog.isPending ? <div className="card"><Spinner label={`Filtering ${PRODUCT.entityLabel}…`} /></div> : null}

      {catalog.data && visibleItems.length === 0 ? (
        <EmptyState
          title={favoritesOnly ? 'No favourites in this view' : `No ${PRODUCT.entityLabel} match those filters`}
          description={
            favoritesOnly
              ? `Heart ${PRODUCT.entityArticle} ${PRODUCT.entitySingular} from the grid, or turn off the favourites filter.`
              : 'Try clearing a filter or searching for a broader term.'
          }
          action={
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setFavoritesOnly(false);
                setPage(1);
              }}
              className="btn text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </button>
          }
        />
      ) : null}

      {catalog.data && visibleItems.length > 0 && layout === 'grid' ? (
        <div className={cx('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', density === 'compact' && 'gap-2')}>
          {visibleItems.map((entity) => (
            <WorldCard
              key={entity.id}
              entity={entity}
              risk={riskScoreFor(entity)}
              density={density}
              favorite={favoriteIds.includes(entity.id)}
              compared={compareIds.includes(entity.id)}
              compareDisabled={compareIds.length >= 3}
              onOpen={() => {
                const next = new URLSearchParams(searchParams);
                next.set('entity', entity.id);
                setSearchParams(next);
              }}
              onToggleFavorite={() => toggleFavorite(entity.id)}
              onToggleCompare={() => toggleCompare(entity.id)}
            />
          ))}
        </div>
      ) : null}

      {catalog.data && visibleItems.length > 0 && layout === 'list' ? (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.6fr_0.7fr_auto] gap-3 border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint md:grid">
            <span>{PRODUCT.entitySingularTitle}</span>
            <span>Category</span>
            <span>Region</span>
            <span>Status</span>
            <span>Risk</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {visibleItems.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('entity', entity.id);
                    setSearchParams(next);
                  }}
                  className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] md:grid-cols-[1.5fr_0.8fr_0.8fr_0.6fr_0.7fr_auto] md:items-center md:gap-3"
                >
                  <span>
                    <span className="block truncate text-sm font-semibold text-ink">{entity.name}</span>
                    <span className="block truncate text-[11px] text-ink-faint">{entity.tags.join(' · ')}</span>
                  </span>
                  <span className="hidden text-xs text-ink-muted md:block">{entity.category}</span>
                  <span className="hidden truncate text-xs text-ink-muted md:block">{entity.region}</span>
                  <span className="hidden md:block">
                    <StatusBadge status={entity.status} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/5">
                      <span
                        className={cx('block h-full rounded-full', riskBand(riskScoreFor(entity)).bar)}
                        style={{ width: `${riskScoreFor(entity)}%` }}
                      />
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">{Math.round(riskScoreFor(entity))}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="hidden text-[10px] text-ink-faint md:inline">
                      {tracked ? `${formatNumber(entity.metrics[tracked.key] ?? 0)} ${tracked.unit}` : null}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {catalog.data && totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-2" aria-label="Catalogue pages">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="btn text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={number === page ? 'page' : undefined}
                className={cx(
                  'h-8 w-8 rounded-lg border text-xs font-semibold transition-colors',
                  number === page ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-line text-ink-muted hover:text-ink'
                )}
              >
                {number}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="btn text-xs">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      ) : null}

      <WorldDetailDrawer entityId={entityId} onClose={closeEntity} />

      {compareOpen ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true" aria-label={`Compare ${PRODUCT.entityLabel}`}>
          <button type="button" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" aria-label="Close comparison" onClick={() => setCompareOpen(false)} />
          <div className="card relative max-h-[86vh] w-full max-w-4xl overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">Side by side</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{PRODUCT.entityLabelTitle} comparison</h2>
                <p className="text-xs text-ink-muted">All six comparable metrics plus deterministic risk.</p>
              </div>
              <button type="button" onClick={() => setCompareOpen(false)} className="btn btn-ghost px-2" aria-label="Close comparison">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold text-ink-faint">Signal</th>
                    {compareWorlds.map((entity) => (
                      <th key={entity.id} className="px-3 py-2">
                        <span className="block font-semibold text-ink">{entity.name}</span>
                        <span className="block text-[10px] font-normal text-ink-faint">
                          {entity.category} · {entity.region}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink-muted">Status</td>
                    {compareWorlds.map((entity) => (
                      <td key={entity.id} className="px-3 py-2">
                        <StatusBadge status={entity.status} />
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink-muted">Risk</td>
                    {compareWorlds.map((entity) => (
                      <td key={entity.id} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <RiskMeter score={riskScoreFor(entity)} size={38} />
                          <span className={cx('text-[11px] font-semibold', riskBand(riskScoreFor(entity)).tone)}>
                            {riskBand(riskScoreFor(entity)).label}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  {METRICS.map((metric) => (
                    <tr key={metric.key} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 text-ink-muted">{metric.label}</td>
                      {compareWorlds.map((entity) => (
                        <td key={entity.id} className="px-3 py-2">
                          <MetricBar metric={metric} value={entity.metrics[metric.key] ?? 0} compact />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Link to="/simulator" className="btn text-xs" onClick={() => setCompareOpen(false)}>
                Open simulation lab
              </Link>
              <button type="button" onClick={() => setCompareOpen(false)} className="btn btn-primary text-xs">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
