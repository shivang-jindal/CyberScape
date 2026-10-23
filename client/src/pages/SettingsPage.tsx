import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  Github,
  Heart,
  Keyboard,
  Link2,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';

import { PRODUCT } from '@cyberscape/shared';

import { useToast } from '../components/Toast';
import { ErrorNote, Panel, SectionHeading, Spinner } from '../components/ui';
import { apiGet, buildQuery } from '../lib/api';
import { cx, downloadJson } from '../lib/format';
import type { CatalogResponse, ShareLinkPayload, VersionResponse } from '../lib/types';
import { useAppStore } from '../store/appStore';

const SHORTCUTS = [
  { keys: 'Ctrl / ⌘ + K', action: 'Open command palette' },
  { keys: '/', action: 'Search from anywhere' },
  { keys: 'Esc', action: 'Close palette, drawer, or dialog' },
  { keys: 'Enter', action: 'Send an assistant message' },
  { keys: 'Shift + Enter', action: 'New line in the assistant input' }
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const density = useAppStore((state) => state.density);
  const setDensity = useAppStore((state) => state.setDensity);
  const reduceMotion = useAppStore((state) => state.reduceMotion);
  const setReduceMotion = useAppStore((state) => state.setReduceMotion);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const resetWorkspace = useAppStore((state) => state.resetWorkspace);
  const simulationPrefill = useAppStore((state) => state.simulationPrefill);
  const [token, setToken] = useState('');
  const [decoding, setDecoding] = useState(false);

  const version = useQuery({
    queryKey: ['version', 'settings'],
    queryFn: () => apiGet<VersionResponse>('/version'),
    retry: 1
  });

  const worlds = useQuery({
    queryKey: ['catalog', 'settings-favourites'],
    queryFn: () => apiGet<CatalogResponse>(`/catalog${buildQuery({ pageSize: 100, sort: 'name' })}`),
    enabled: favoriteIds.length > 0,
    staleTime: 60_000
  });

  async function decodeToken() {
    const clean = token.trim();
    if (!clean) return;
    setDecoding(true);
    try {
      const { payload } = await apiGet<{ payload: ShareLinkPayload }>(`/share-links/${encodeURIComponent(clean)}`);
      const query = new URLSearchParams();
      if (payload.entityId) query.set('entity', payload.entityId);
      if (payload.category) query.set('category', payload.category);
      if (payload.q) query.set('q', payload.q);
      if (payload.page) query.set('page', String(payload.page));
      navigate(`/catalog?${query.toString()}`);
      addToast({ type: 'success', title: 'Share link decoded', message: 'Opening the encoded catalogue view.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Invalid share link', message: (error as Error).message });
    } finally {
      setDecoding(false);
    }
  }

  const favouriteWorlds = (worlds.data?.items ?? []).filter((entity) => favoriteIds.includes(entity.id));

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Settings"
        title="Tune the workbench"
        description={`Preferences live in this browser. The catalogue, simulation engine, and assistant are server-owned and deterministic, so clearing local state never changes ${PRODUCT.entityArticle} ${PRODUCT.entitySingular}.`}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Workspace preferences" description="Display-only controls; they never alter engine output.">
          <div className="space-y-4">
            <div>
              <p className="label">Card density</p>
              <div className="grid grid-cols-2 gap-2">
                {(['comfortable', 'compact'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDensity(mode)}
                    aria-pressed={density === mode}
                    className={cx(
                      'rounded-xl border p-3 text-left transition-colors',
                      density === mode ? 'border-brand-400/50 bg-brand-500/10' : 'border-line bg-surface-sunken/50 hover:border-brand-400/30'
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize text-ink">{mode}</span>
                      {density === mode ? <Check className="h-3.5 w-3.5 text-brand-300" /> : null}
                    </span>
                    <span className="mt-1 block text-[10px] text-ink-muted">
                      {mode === 'comfortable' ? 'Full summaries and three metric bars.' : `Dense grid for scanning more ${PRODUCT.entityLabel}.`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-sunken/50 p-3">
              <div className="flex gap-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <div>
                  <p className="text-xs font-semibold text-ink">Reduce motion</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">Disable visual pulses, fades, and slide transitions.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => setReduceMotion(!reduceMotion)}
                className={cx(
                  'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
                  reduceMotion ? 'border-brand-400/50 bg-brand-500/40' : 'border-line bg-white/10'
                )}
                aria-label="Reduce motion"
              >
                <span
                  className="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ transform: reduceMotion ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-sunken/50 p-3">
              <div className="flex gap-2.5">
                <Settings2 className="mt-0.5 h-4 w-4 text-brand-300" />
                <div>
                  <p className="text-xs font-semibold text-ink">Simulation prefill</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {simulationPrefill ? `Queued: ${simulationPrefill.action ?? 'any action'}` : 'No queued scenario'}
                  </p>
                </div>
              </div>
              <span className={cx('chip', simulationPrefill ? 'border-amber-400/30 text-amber-200' : '')}>
                {simulationPrefill ? 'pending' : 'empty'}
              </span>
            </div>
          </div>
        </Panel>

        <Panel
          title="API connection"
          description="The web client talks to a typed Express API under /api/v1."
          actions={
            <button type="button" onClick={() => version.refetch()} className="btn btn-ghost text-xs">
              Re-check
            </button>
          }
        >
          {version.isPending ? <Spinner label="Checking API…" /> : null}
          {version.isError ? <ErrorNote message={(version.error as Error).message} onRetry={() => version.refetch()} /> : null}
          {version.data ? (
            <div className="space-y-2">
              {[
                { label: 'Status', value: 'reachable', tone: 'text-emerald-300' },
                { label: 'Service', value: version.data.name, tone: 'text-ink' },
                { label: 'Version', value: version.data.version, tone: 'text-ink' },
                { label: 'API version', value: version.data.apiVersion, tone: 'text-ink' },
                { label: 'Base path', value: '/api/v1', tone: 'text-ink' }
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-line bg-surface-sunken/50 px-3 py-2 text-xs">
                  <span className="text-ink-muted">{row.label}</span>
                  <span className={cx('font-mono font-semibold', row.tone)}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-2.5 text-[11px] text-emerald-100/80">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                Rate-limited, Helmet-hardened, Zod-validated, and CORS-scoped. Unknown routes return typed 404s.
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Favourites"
          description={`${favoriteIds.length} ${PRODUCT.entityLabel} pinned in this browser.`}
          actions={
            favoriteIds.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  favoriteIds.forEach((id) => toggleFavorite(id));
                  addToast({ type: 'info', title: 'Favourites cleared' });
                }}
                className="btn btn-ghost text-xs"
              >
                Clear all
              </button>
            ) : null
          }
        >
          {favoriteIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <Heart className="mb-2 h-5 w-5 text-ink-faint" />
              <p className="text-xs font-semibold text-ink">No favourites yet</p>
              <p className="mt-1 text-[11px] text-ink-muted">Heart {PRODUCT.entityArticle} {PRODUCT.entitySingular} in the catalogue to pin it here.</p>
            </div>
          ) : worlds.isPending ? (
            <Spinner label="Resolving favourites…" />
          ) : (
            <ul className="space-y-1.5">
              {favouriteWorlds.map((entity) => (
                <li key={entity.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/catalog?entity=${encodeURIComponent(entity.id)}`)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-xs font-semibold text-ink">{entity.name}</span>
                    <span className="block text-[10px] text-ink-faint">
                      {entity.category} · {entity.region}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(entity.id)}
                    className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-white/5 hover:text-rose-300"
                    aria-label={`Remove ${entity.name} from favourites`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Open a share link" description={`Paste a token produced by Share view or ${PRODUCT.entityArticle} ${PRODUCT.entitySingular} dossier.`}>
          <div className="space-y-2">
            <label className="label" htmlFor="share-token">
              Share token
            </label>
            <div className="flex gap-2">
              <input
                id="share-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="eyJlbnRpdHlJZCI6…"
                className="input font-mono"
              />
              <button type="button" onClick={decodeToken} disabled={!token.trim() || decoding} className="btn btn-primary shrink-0">
                <Link2 className="h-3.5 w-3.5" />
                {decoding ? 'Opening…' : 'Open'}
              </button>
            </div>
            <p className="text-[11px] text-ink-muted">
              Tokens are base64url-encoded, schema-validated, and contain only view state — never credentials.
            </p>
          </div>
        </Panel>

        <Panel title="Data & portability" description="Everything here is yours to take or clear.">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                downloadJson(`${PRODUCT.repo.toLowerCase()}-workspace.json`, {
                  exportedAt: new Date().toISOString(),
                  product: PRODUCT.name,
                  density,
                  reduceMotion,
                  favoriteIds,
                  simulationPrefill
                });
                addToast({ type: 'success', title: 'Workspace exported' });
              }}
              className="btn text-xs"
            >
              Export workspace
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear density, motion, favourites, and simulation prefill from this browser?')) {
                  resetWorkspace();
                  addToast({ type: 'info', title: 'Workspace reset', message: 'Local preferences were cleared.' });
                }
              }}
              className="btn border-rose-400/30 text-xs text-rose-200 hover:bg-rose-400/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset workspace
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
            No account, no server-side profile, no tracking. Favourites and display preferences are stored in
            localStorage under <span className="font-mono text-ink">{PRODUCT.repo.toLowerCase()}-workspace</span>.
          </p>
        </Panel>

        <Panel title="Keyboard shortcuts" description="Built for keyboard-first analysis.">
          <ul className="space-y-1.5">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2">
                <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">{shortcut.keys}</kbd>
                <span className="text-[11px] text-ink-muted">{shortcut.action}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-faint">
            <Keyboard className="h-3 w-3" />
            Shortcuts respect focus: typing in an input never triggers the global palette.
          </div>
        </Panel>
      </div>

      <Panel title="About this build" description="Open source, MIT licensed, and built in the open.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-sunken/50 p-3">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <p className="mt-2 text-xs font-semibold text-ink">{PRODUCT.name}</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{PRODUCT.tagline}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-sunken/50 p-3">
            <BookOpen className="h-4 w-4 text-brand-300" />
            <p className="mt-2 text-xs font-semibold text-ink">Documentation</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">README, CONTRIBUTING, SECURITY, and the full API reference live in the repository.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-sunken/50 p-3">
            <Github className="h-4 w-4 text-brand-300" />
            <p className="mt-2 text-xs font-semibold text-ink">Source</p>
            <a
              href={`https://github.com/shivang-jindal/${PRODUCT.repo}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand-200 hover:underline"
            >
              shivang-jindal/{PRODUCT.repo}
            </a>
          </div>
        </div>
      </Panel>
    </div>
  );
}
