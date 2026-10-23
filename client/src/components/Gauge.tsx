import { useId } from 'react';

export function Gauge({
  value,
  label,
  size = 120,
  tone = '#34d399'
}: {
  value: number;
  label: string;
  size?: number;
  tone?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const radius = size / 2 - 9;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${label}: ${Math.round(value)} out of 100`}>
        <defs>
          <linearGradient id={`gauge-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.7" />
            <stop offset="100%" stopColor={tone} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gauge-${uid})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute text-center">
        <span className="block font-mono text-2xl font-semibold leading-none text-ink">{Math.round(value)}</span>
        <span className="mt-1 block text-[9px] uppercase tracking-[0.16em] text-ink-faint">{label}</span>
      </span>
    </div>
  );
}
