import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  ClipboardCopy,
  Download,
  FlaskConical,
  Gauge as GaugeIcon,
  History,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert
} from 'lucide-react';

import {
  ACTIONS,
  METRICS,
  PRODUCT,
  STATUSES,
  type CatalogEntity,
  type SimulationAction,
  type SimulationResult
} from '@cyberscape/shared';

import { Gauge } from '../components/Gauge';
import { TimelineChart } from '../components/TimelineChart';
import { useToast } from '../components/Toast';
import { ErrorNote, Panel, SectionHeading, Spinner, StatusBadge } from '../components/ui';
import { apiGet, apiPost, buildQuery } from '../lib/api';
import { copyText, cx, downloadJson, formatMetric, severityTone, timeAgo } from '../lib/format';
import type { CatalogResponse } from '../lib/types';
import { useAppStore } from '../store/appStore';

const SEVERITY_TEXT: Record<SimulationAction['severity'], string> = {
  low: 'text-sky-300',
  medium: 'text-amber-300',
  high: 'text-orange-300',
  critical: 'text-rose-300'
};

export function SimulatorPage() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const prefill = useAppStore((state) => state.simulationPrefill);
  const setSimulationPrefill = useAppStore((state) => state.setSimulationPrefill);

  const defaultAction = ACTIONS[0]?.id ?? '';
  const [action, setAction] = useState(() => prefill?.action ?? searchParams.get('action') ?? defaultAction);
  const [targetId, setTargetId] = useState(() => prefill?.targetId ?? searchParams.get('target') ?? '');
  const [intensity, setIntensity] = useState(0.6);
  const [horizon, setHorizon] = useState(24);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  const entities = useQuery({
    queryKey: ['catalog', 'simulator'],
    queryFn: () => apiGet<CatalogResponse>(`/catalog${buildQuery({ pageSize: 100, sort: 'name' })}`),
    staleTime: 60_000
  });

  useEffect(() => {
    if (prefill) {
      if (prefill.action) setAction(prefill.action);
      if (prefill.targetId) setTargetId(prefill.targetId);
      setSimulationPrefill(null);
    }
    // Prefill is consumed once on mount; clearing it prevents stale reruns.
  }, []);

  useEffect(() => {
    if (!targetId && entities.data?.items[0]) setTargetId(entities.data.items[0].id);
  }, [targetId, entities.data]);

  const simulation = useMutation({
    mutationFn: () =>
      apiPost<SimulationResult>('/simulate', {
        action,
        targetId,
        intensity,
        horizonHours: horizon
      }),
    onSuccess: (data) => {
      setResult(data);
      setHistory((current) => [data, ...current.filter((entry) => entry.id !== data.id)].slice(0, 5));
      addToast({ type: 'success', title: 'Simulation complete', message: `${data.actionLabel} on ${data.targetName}.` });
    },
    onError: (error: Error) => addToast({ type: 'error', title: 'Simulation failed', message: error.message })
  });

  const selectedAction = useMemo(() => ACTIONS.find((item) => item.id === action) ?? ACTIONS[0], [action]);
  const selectedEntity = useMemo(
    () => entities.data?.items.find((item) => item.id === targetId),
    [entities.data, targetId]
  );

  const canSubmit = Boolean(targetId) && !simulation.isPending;
  const impactTone = result ? (result.impactScore >= 70 ? '#fb7185' : result.impactScore >= 45 ? '#fbbf24' : '#34d399') : '#34d399';

  function resetForm() {
    setAction(defaultAction);
    setIntensity(0.6);
    setHorizon(24);
    setResult(null);
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Simulation lab"
        title={`Stress-test ${PRODUCT.entityArticle} ${PRODUCT.entitySingular} before it becomes canon`}
        description={`Every intervention is deterministic: the same target, action, intensity, and horizon always yield the same impact curve. Tune a scenario, inspect the cascade, then export the record.`}
        actions={
          <>
            <Link to="/assistant" className="btn text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Ask the {PRODUCT.assistantName}
            </Link>
            <button type="button" onClick={resetForm} className="btn btn-ghost text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Panel title="Scenario" description={`Pick an intervention and ${PRODUCT.entityArticle} ${PRODUCT.entitySingular}, then tune the envelope.`}>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="sim-target">
                  Target {PRODUCT.entitySingular}
                </label>
                <select
                  id="sim-target"
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  className="select"
                  disabled={entities.isPending}
                >
                  <option value="">Select {PRODUCT.entityArticle} {PRODUCT.entitySingular}…</option>
                  {entities.data?.items.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} — {entity.category} · {entity.status}
                    </option>
                  ))}
                </select>
                {selectedEntity ? <EntitySummary entity={selectedEntity} /> : null}
              </div>

              <div>
                <span className="label">Intervention</span>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {ACTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAction(item.id)}
                      aria-pressed={action === item.id}
                      className={cx(
                        'rounded-lg border px-2.5 py-2 text-left transition-colors',
                        action === item.id
                          ? 'border-brand-400/50 bg-brand-500/10'
                          : 'border-line bg-surface-sunken/50 hover:border-brand-400/30'
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">{item.label}</span>
                        <span className={cx('text-[9px] font-bold uppercase tracking-wide', SEVERITY_TEXT[item.severity])}>
                          {item.severity}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-muted">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0" htmlFor="intensity">
                      Intensity
                    </label>
                    <span className="font-mono text-xs text-brand-200">{Math.round(intensity * 100)}%</span>
                  </div>
                  <input
                    id="intensity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={intensity}
                    onChange={(event) => setIntensity(Number(event.target.value))}
                    className="mt-2 w-full accent-emerald-400"
                  />
                  <p className="mt-1 text-[10px] text-ink-faint">0 = baseline nudges · 1 = full-force cascade</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label mb-0" htmlFor="horizon">
                      Horizon
                    </label>
                    <span className="font-mono text-xs text-brand-200">{horizon}h</span>
                  </div>
                  <input
                    id="horizon"
                    type="range"
                    min="1"
                    max="72"
                    step="1"
                    value={horizon}
                    onChange={(event) => setHorizon(Number(event.target.value))}
                    className="mt-2 w-full accent-emerald-400"
                  />
                  <p className="mt-1 text-[10px] text-ink-faint">1–72 simulated hours, seven checkpoints</p>
                </div>
              </div>

              <div className="rounded-lg border border-line bg-surface-sunken/60 p-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Scenario brief</p>
                <p className="mt-1 text-xs text-ink-muted">{selectedAction?.description}</p>
              </div>

              <button type="button" onClick={() => simulation.mutate()} disabled={!canSubmit} className="btn btn-primary w-full">
                <Play className="h-4 w-4" />
                {simulation.isPending ? 'Running simulation…' : 'Run simulation'}
              </button>
              {simulation.isError ? <ErrorNote message={(simulation.error as Error).message} onRetry={() => simulation.mutate()} /> : null}
            </div>
          </Panel>

          <Panel
            title="Run history"
            description="Latest five results in this session."
            actions={<History className="h-4 w-4 text-ink-faint" />}
          >
            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No runs yet. Your first simulation will appear here.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setResult(entry)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2 text-left transition-colors hover:border-brand-400/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink">
                          {entry.actionLabel} · {entry.targetName}
                        </span>
                        <span className="block text-[10px] text-ink-faint">
                          {timeAgo(entry.createdAt)} · {entry.timeline.length} checkpoints
                        </span>
                      </span>
                      <span className={cx('font-mono text-sm font-semibold', entry.impactScore >= 70 ? 'text-rose-300' : entry.impactScore >= 45 ? 'text-amber-300' : 'text-emerald-300')}>
                        {Math.round(entry.impactScore)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {simulation.isPending ? (
            <Panel>
              <Spinner label="Propagating the intervention…" />
            </Panel>
          ) : null}

          {result ? (
            <>
              <Panel
                title="Impact report"
                description={`${result.actionLabel} on ${result.targetName}`}
                actions={
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(JSON.stringify(result, null, 2));
                        addToast({ type: ok ? 'success' : 'error', title: ok ? 'Result copied' : 'Copy failed' });
                      }}
                      className="btn btn-ghost px-2"
                      aria-label="Copy result JSON"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadJson(`simulation-${result.id}.json`, result)}
                      className="btn text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>
                  </div>
                }
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Gauge value={result.impactScore} label="impact" size={112} tone={impactTone} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={
                          result.impactScore >= 70
                            ? STATUSES[STATUSES.length - 1] ?? 'critical'
                            : STATUSES[1] ?? STATUSES[0] ?? 'degraded'
                        }
                      />
                      <span className="chip">{result.affected.length} affected</span>
                      <span className="chip">{result.timeline[result.timeline.length - 1]?.hour ?? 0}h horizon</span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Impact is severity-weighted and bounded 0–100. Affected {PRODUCT.entityLabel} inherit the event's
                      category neighbourhood, scaled by their position.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Availability', value: result.timeline[result.timeline.length - 1]?.availability ?? 0, tone: 'text-emerald-300' },
                        { label: 'Load', value: result.timeline[result.timeline.length - 1]?.load ?? 0, tone: 'text-amber-300' },
                        { label: 'Risk', value: result.timeline[result.timeline.length - 1]?.risk ?? 0, tone: 'text-rose-300' }
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-line bg-surface-sunken/60 px-2 py-1.5">
                          <p className="text-[9px] uppercase tracking-wide text-ink-faint">{item.label}</p>
                          <p className={cx('font-mono text-sm font-semibold', item.tone)}>{formatMetric(item.value, 'percent')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <TimelineChart points={result.timeline} />
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Cascade" description={`Neighbouring ${PRODUCT.entityLabel}, ordered by exposure.`}>
                  {result.affected.length === 0 ? (
                    <p className="text-xs text-ink-faint">No neighbours in this category. The target absorbs the full impact.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {result.affected.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-ink">{item.name}</span>
                            <span className="block text-[10px] text-ink-faint">{item.category}</span>
                          </span>
                          <span className={cx('chip capitalize', severityTone(item.severity))}>{item.severity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Recommended actions" description="Three targeted follow-ups from the engine.">
                  <ol className="space-y-2">
                    {result.recommendations.map((recommendation, index) => (
                      <li key={recommendation} className="flex gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-400/30 bg-brand-400/10 font-mono text-[10px] text-brand-200">
                          {index + 1}
                        </span>
                        <span className="text-xs leading-relaxed text-ink-muted">{recommendation}</span>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
                <p className="text-[11px] text-ink-faint">
                  Simulation <span className="font-mono text-ink-muted">{result.id.slice(0, 8)}</span> · deterministic
                </p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => simulation.mutate()} className="btn text-xs">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-run
                  </button>
                  <Link to="/catalog" className="btn btn-primary text-xs">
                    Open catalogue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </>
          ) : null}

          {!result && !simulation.isPending ? (
            <Panel>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-400/10">
                  <FlaskConical className="h-7 w-7 text-brand-300" />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[#04140d]">
                    <GaugeIcon className="h-3 w-3" />
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-ink">Your simulation will appear here</h2>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">
                  Choose {PRODUCT.entityArticle} {PRODUCT.entitySingular} and an intervention. The engine returns an impact score, a
                  seven-point timeline, a cascade list, and three recommendations — all reproducible.
                </p>
                <div className="mt-5 grid w-full max-w-md gap-2 sm:grid-cols-3">
                  {[
                    { icon: Activity, label: '7 checkpoints' },
                    { icon: TriangleAlert, label: 'Bounded 0–100' },
                    { icon: Sparkles, label: '3 playbooks' }
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-line bg-surface-sunken/60 px-2 py-2 text-[10px] text-ink-muted">
                      <item.icon className="mx-auto mb-1 h-3.5 w-3.5 text-brand-300" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel title="Metric reference" description={`The six signals every ${PRODUCT.entitySingular} carries.`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.key} className="rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2 text-[11px]">
                  <span className="block font-semibold text-ink">{metric.label}</span>
                  <span className="text-ink-faint">
                    {metric.unit} · {metric.higherIsBetter ? 'higher is better' : 'lower is better'}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EntitySummary({ entity }: { entity: CatalogEntity }) {
  const tracked = METRICS[1] ?? METRICS[0];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-sunken/60 px-2.5 py-2">
      <StatusBadge status={entity.status} />
      <span className="text-[11px] text-ink-muted">
        {entity.region} ·{' '}
        {tracked
          ? `${tracked.label} ${formatMetric(entity.metrics[tracked.key] ?? 0, tracked.format)}${tracked.unit && tracked.format !== 'percent' ? ` ${tracked.unit}` : ''}`
          : null}
      </span>
    </div>
  );
}
