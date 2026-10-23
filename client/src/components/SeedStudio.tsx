import { useMemo, useState } from 'react';
import { Check, Copy, Dices, Save, Sparkles } from 'lucide-react';

import { METRICS, PRODUCT, SEED_SUGGESTIONS } from '@cyberscape/shared';

import { copyText, formatMetric, riskBand, statusTone } from '../lib/format';
import { previewSeed } from '../lib/generate';
import { useToast } from './Toast';
import { WorldGlobe } from './WorldGlobe';
import { MetricBar, RiskMeter } from './ui';

const STORAGE_KEY = `${PRODUCT.repo.toLowerCase()}:saved-seeds`;

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function SeedStudio() {
  const [draft, setDraft] = useState(SEED_SUGGESTIONS[0] ?? 'uncharted');
  const [seed, setSeed] = useState(SEED_SUGGESTIONS[0] ?? 'uncharted');
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const preview = useMemo(() => previewSeed(seed), [seed]);
  const band = riskBand(preview.risk);
  const tracked = METRICS[1] ?? METRICS[0];
  const trackedValue = tracked ? preview.metrics[tracked.key] ?? 0 : 0;

  function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setSeed(draft.trim() || 'uncharted');
  }

  function saveSeed() {
    const next = [seed, ...saved.filter((value) => value !== seed)].slice(0, 8);
    setSaved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      addToast({ type: 'success', title: 'Seed pinned', message: `"${seed}" is now in your local seed shelf.` });
    } catch {
      addToast({ type: 'warning', title: 'Seed pinned for this session', message: 'Local storage is unavailable.' });
    }
  }

  async function copySeed() {
    const ok = await copyText(seed);
    setCopied(ok);
    addToast({ type: ok ? 'success' : 'error', title: ok ? 'Seed copied' : 'Could not copy seed' });
    window.setTimeout(() => setCopied(false), 1500);
  }

  const derived = METRICS.slice(0, 3).map((metric) => ({
    label: metric.label,
    value: `${formatMetric(preview.metrics[metric.key] ?? 0, metric.format)}${
      metric.unit && metric.format !== 'percent' ? ` ${metric.unit}` : ''
    }`
  }));

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-300" />
            <h2 className="text-sm font-semibold text-ink">Seed studio</h2>
            <span className="chip border-brand-400/25 bg-brand-400/5 text-brand-200">live preview</span>
          </div>
          <p className="mt-1 max-w-xl text-xs text-ink-muted">
            Type any phrase. The same FNV-1a + Mulberry32 primitives as the server derive a preview{' '}
            {PRODUCT.entitySingular} instantly — no request, no database, no drift.
          </p>

          <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="seed-input">
              {PRODUCT.entitySingularTitle} seed
            </label>
            <input
              id="seed-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={SEED_SUGGESTIONS[0] ?? 'type a seed'}
              className="input font-mono"
              maxLength={64}
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Generate
            </button>
            <button
              type="button"
              onClick={() => {
                const next = SEED_SUGGESTIONS[Math.floor(Math.random() * SEED_SUGGESTIONS.length)] ?? 'aeon';
                setDraft(`${next}-${Math.floor(Math.random() * 900 + 100)}`);
              }}
              className="btn shrink-0"
              aria-label="Surprise me with a seed"
            >
              <Dices className="h-4 w-4" />
              Surprise
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SEED_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setDraft(suggestion);
                  setSeed(suggestion);
                }}
                className="chip transition-colors hover:border-brand-400/40 hover:text-brand-200"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
            <span className="font-mono">{preview.hex}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{preview.hash}</span>
            <span aria-hidden="true">·</span>
            <span>hash locked</span>
          </div>

          {saved.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Pinned seeds</p>
              <div className="flex flex-wrap gap-1.5">
                {saved.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setDraft(value);
                      setSeed(value);
                    }}
                    className={`chip transition-colors hover:text-ink ${value === seed ? 'border-brand-400/40 text-brand-200' : ''}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {derived.map((item) => (
              <div key={item.label} className="rounded-lg border border-line bg-surface-sunken/50 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{item.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-line bg-surface-sunken/70 p-4 lg:w-[290px]">
          <div className="flex items-start gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-slate-950">
              <WorldGlobe seed={seed} status={preview.status} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`chip capitalize ${statusTone(preview.status)}`}>{preview.status}</span>
              <h3 className="mt-1.5 truncate text-base font-semibold text-ink">{preview.name}</h3>
              <p className="text-[11px] text-ink-faint">
                {preview.category} · {preview.region}
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${band.tone}`}>{band.label} risk</p>
            </div>
            <RiskMeter score={preview.risk} size={44} />
          </div>

          <div className="mt-3 space-y-2">
            {METRICS.slice(0, 4).map((metric) => (
              <MetricBar key={metric.key} metric={metric} value={preview.metrics[metric.key] ?? 0} compact />
            ))}
          </div>

          <div className="mt-3 flex gap-1.5">
            <button type="button" onClick={copySeed} className="btn flex-1 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </button>
            <button type="button" onClick={saveSeed} className="btn flex-1 text-xs">
              <Save className="h-3.5 w-3.5" />
              Pin
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-ink-faint">
            {tracked ? `${formatMetric(trackedValue, tracked.format)} ${tracked.label.toLowerCase()}` : null}
          </p>
        </div>
      </div>
    </div>
  );
}
