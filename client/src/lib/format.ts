export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

export function formatMetric(value: number, format: 'number' | 'percent' | 'compact'): string {
  if (format === 'percent') return `${formatNumber(value)}%`;
  if (format === 'compact') {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return formatNumber(value);
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export function riskBand(risk: number): { label: string; tone: string; bar: string } {
  if (risk >= 70) return { label: 'Critical', tone: 'text-rose-300', bar: 'bg-rose-400' };
  if (risk >= 45) return { label: 'Elevated', tone: 'text-amber-300', bar: 'bg-amber-400' };
  if (risk >= 25) return { label: 'Watch', tone: 'text-sky-300', bar: 'bg-sky-400' };
  return { label: 'Nominal', tone: 'text-emerald-300', bar: 'bg-emerald-400' };
}

const CRITICAL_STATUSES = new Set(['anomalous', 'critical', 'endangered', 'compromised']);
const WARNING_STATUSES = new Set(['evolving', 'degraded', 'vulnerable', 'drifting']);

export function statusLevel(status: string): 'critical' | 'warning' | 'good' {
  if (CRITICAL_STATUSES.has(status)) return 'critical';
  if (WARNING_STATUSES.has(status)) return 'warning';
  return 'good';
}

export function statusTone(status: string): string {
  const level = statusLevel(status);
  if (level === 'critical') return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  if (level === 'warning') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
}

export function severityTone(severity: string): string {
  if (severity === 'critical') return 'border-rose-400/40 bg-rose-400/15 text-rose-200';
  if (severity === 'high') return 'border-orange-400/40 bg-orange-400/10 text-orange-200';
  if (severity === 'medium') return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'just now';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
