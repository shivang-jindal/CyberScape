import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

import type { CatalogMetric } from '@cyberscape/shared';

import { cx, formatMetric, riskBand, statusLevel, statusTone } from '../lib/format';

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const level = statusLevel(status);
  return (
    <span className={cx('chip capitalize', statusTone(status))}>
      <span
        className={cx(
          'h-1.5 w-1.5 rounded-full',
          level === 'critical' ? 'bg-rose-300' : level === 'warning' ? 'bg-amber-300' : 'bg-emerald-300'
        )}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

export function MetricBar({
  metric,
  value,
  compact = false
}: {
  metric: CatalogMetric;
  value: number;
  compact?: boolean;
}) {
  const max = metric.max ?? (metric.format === 'percent' ? 100 : 100);
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const good = metric.higherIsBetter ? ratio >= 0.55 : ratio <= 0.45;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('text-ink-muted', compact ? 'text-[11px]' : 'text-xs')}>{metric.label}</span>
        <span className="font-mono text-xs font-semibold text-ink">
          {formatMetric(value, metric.format)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={cx(
            'h-full rounded-full transition-[width] duration-500',
            good ? 'bg-brand-400' : metric.higherIsBetter ? 'bg-amber-400' : 'bg-rose-400/80'
          )}
          style={{ width: `${Math.max(3, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function RiskMeter({ score, size = 72 }: { score: number; size?: number }) {
  const band = riskBand(score);
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className={band.tone}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute text-center">
        <span className={cx('block font-mono text-sm font-semibold leading-none', band.tone)}>
          {Math.round(score)}
        </span>
        <span className="block text-[8px] uppercase tracking-widest text-ink-faint">risk</span>
      </span>
    </div>
  );
}

export function ScoreBar({ score, label }: { score: number; label?: string }) {
  const band = riskBand(score);
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] text-ink-muted">
          <span>{label}</span>
          <span className={cx('font-mono font-semibold', band.tone)}>{Math.round(score)}</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={cx('h-full rounded-full', band.bar)} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'text-brand-300'
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        {icon ? <span className={tone}>{icon}</span> : null}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('card p-5', className)}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-brand-300" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 rounded-full border border-line bg-white/5 p-3 text-ink-muted">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-100">Something went wrong</p>
        <p className="mt-0.5 break-words text-xs text-rose-200/80">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn shrink-0 text-xs">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
            value === option.value ? 'bg-brand-500 text-[#04140d]' : 'text-ink-muted hover:text-ink'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
