import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, Download, FlaskConical, GitBranch, Share2, X } from 'lucide-react';

import { METRICS, PRODUCT } from '@cyberscape/shared';

import { apiGet, apiPost } from '../lib/api';
import { copyText, cx, downloadJson, formatMetric, riskBand, statusTone } from '../lib/format';
import type { EntityDetail, ShareLinkResponse } from '../lib/types';
import { useAppStore } from '../store/appStore';
import { useToast } from './Toast';
import { Sparkline } from './Sparkline';
import { WorldGlobe } from './WorldGlobe';
import { ErrorNote, MetricBar, RiskMeter, Spinner } from './ui';

export function WorldDetailDrawer({ entityId, onClose }: { entityId: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const setSimulationPrefill = useAppStore((state) => state.setSimulationPrefill);
  const setFilters = useAppStore((state) => state.setFilters);
  const [copied, setCopied] = useState(false);

  const detail = useQuery({
    queryKey: ['world', entityId],
    queryFn: () => apiGet<EntityDetail>(`/catalog/${encodeURIComponent(entityId ?? '')}`),
    enabled: Boolean(entityId)
  });

  const share = useMutation({
    mutationFn: (id: string) => apiPost<ShareLinkResponse>('/share-links', { entityId: id }),
    onSuccess: async (data) => {
      const url = `${window.location.origin}/?share=${encodeURIComponent(data.token)}`;
      const ok = await copyText(url);
      addToast({
        type: ok ? 'success' : 'info',
        title: ok ? 'Share link copied' : 'Share link created',
        message: ok ? `Anyone with the link can open this ${PRODUCT.entitySingular}.` : url
      });
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Could not create link', message: error.message })
  });

  useEffect(() => {
    if (!entityId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [entityId, onClose]);

  if (!entityId) return null;

  const entity = detail.data?.entity;
  const band = detail.data ? riskBand(detail.data.riskScore) : null;
  const tracked = METRICS[1] ?? METRICS[0];
  const trackedValue = entity && tracked ? entity.metrics[tracked.key] ?? 0 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={`${PRODUCT.entitySingularTitle} detail`}>
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm" aria-label="Close detail" onClick={onClose} />

      <aside className="relative flex h-full w-full max-w-xl animate-slide-in flex-col border-l border-line bg-surface-sunken shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">{PRODUCT.entitySingularTitle} dossier</p>
            <p className="text-xs text-ink-faint">Deterministic record · {entityId}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!entity || share.isPending}
              onClick={() => entity && share.mutate(entity.id)}
              className="btn btn-ghost px-2"
              aria-label="Create share link"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!detail.data) return;
                downloadJson(`${detail.data.entity.id}.json`, detail.data);
                addToast({ type: 'success', title: 'Dossier exported', message: 'JSON downloaded.' });
              }}
              disabled={!detail.data}
              className="btn btn-ghost px-2"
              aria-label="Export dossier JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost px-2" aria-label="Close detail">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {detail.isPending ? <Spinner label={`Reconstructing ${PRODUCT.entitySingular}…`} /> : null}
          {detail.isError ? <ErrorNote message={(detail.error as Error).message} onRetry={() => detail.refetch()} /> : null}

          {entity && detail.data ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-line bg-slate-950">
                  <WorldGlobe seed={entity.id} status={entity.status} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cx('chip capitalize', statusTone(entity.status))}>{entity.status}</span>
                    <span className="chip">{entity.category}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{entity.name}</h2>
                  <p className="text-xs text-ink-muted">{entity.region}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <RiskMeter score={detail.data.riskScore} size={54} />
                    <div>
                      <p className={cx('text-sm font-semibold', band?.tone)}>{band?.label} risk</p>
                      <p className="text-[11px] text-ink-faint">Derived from status + stable seed spread</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-ink-muted">{entity.summary}</p>

              <div className="flex flex-wrap gap-1.5">
                {entity.tags.map((tag) => (
                  <span key={tag} className="chip">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Seed fingerprint</p>
                    <p className="mt-1 font-mono text-sm text-brand-200">{entity.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyText(entity.id);
                      setCopied(ok);
                      addToast({ type: ok ? 'success' : 'error', title: ok ? 'Seed copied' : 'Copy failed' });
                      window.setTimeout(() => setCopied(false), 1500);
                    }}
                    className="btn px-2"
                    aria-label={`Copy ${PRODUCT.entitySingular} seed`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-muted sm:grid-cols-4">
                  <span className="font-mono">FNV-1a</span>
                  <span className="font-mono">Mulberry32</span>
                  <span className="font-mono">12 epochs</span>
                  <span className="font-mono">0 side effects</span>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Comparable metrics</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {METRICS.map((metric) => (
                    <MetricBar key={metric.key} metric={metric} value={entity.metrics[metric.key] ?? 0} />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tracked?.label ?? 'Tracked metric'} history</h3>
                    <p className="text-[11px] text-ink-muted">12 deterministic epochs, latest at the right.</p>
                  </div>
                  <span className="font-mono text-xs text-brand-200">
                    {tracked ? formatMetric(trackedValue, tracked.format) : null}
                  </span>
                </div>
                <div className="mt-3">
                  <Sparkline
                    values={detail.data.history.map((point) => point.value)}
                    height={84}
                    showDots
                    label={`${tracked?.label ?? 'Tracked metric'} history`}
                  />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-faint">
                  <span>{detail.data.history[0]?.period}</span>
                  <span>{detail.data.history[detail.data.history.length - 1]?.period}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimulationPrefill({ targetId: entity.id });
                    onClose();
                    navigate('/simulator');
                  }}
                  className="btn btn-primary"
                >
                  <FlaskConical className="h-4 w-4" />
                  Simulate event
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ q: '', category: entity.category, region: '', status: '', sort: 'name' });
                    onClose();
                    navigate(`/catalog?category=${encodeURIComponent(entity.category)}`);
                  }}
                  className="btn"
                >
                  <GitBranch className="h-4 w-4" />
                  Find neighbours
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Related {PRODUCT.entityLabel}</h3>
                <ul className="space-y-1.5">
                  {detail.data.related.map((related) => (
                    <li key={related.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(`/catalog?entity=${encodeURIComponent(related.id)}`);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-brand-400/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-ink">{related.name}</span>
                          <span className="block text-[10px] text-ink-faint">
                            {related.category} · {related.region} ·{' '}
                            {tracked ? formatMetric(related.metrics[tracked.key] ?? 0, tracked.format) : null}
                          </span>
                        </span>
                        <span className="chip shrink-0">{related.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
