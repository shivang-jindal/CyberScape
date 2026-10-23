import { useState } from 'react';

import type { SimulationResult } from '@cyberscape/shared';

type Point = SimulationResult['timeline'][number];

const SERIES = [
  { key: 'availability', label: 'Availability', color: '#34d399' },
  { key: 'load', label: 'Load', color: '#fbbf24' },
  { key: 'risk', label: 'Risk', color: '#fb7185' }
] as const;

const WIDTH = 620;
const HEIGHT = 240;
const PAD = { left: 34, right: 12, top: 14, bottom: 28 };

export function TimelineChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const maxHour = Math.max(1, ...points.map((point) => point.hour));
  const usableW = WIDTH - PAD.left - PAD.right;
  const usableH = HEIGHT - PAD.top - PAD.bottom;

  const x = (hour: number) => PAD.left + (hour / maxHour) * usableW;
  const y = (value: number) => PAD.top + usableH - (Math.max(0, Math.min(100, value)) / 100) * usableH;

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3">
          {SERIES.map((series) => (
            <span key={series.key} className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              <span className="h-1.5 w-4 rounded-full" style={{ background: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
        <span className="font-mono text-[10px] text-ink-faint">
          {hovered ? `T+${hovered.hour}h · A ${Math.round(hovered.availability)} · L ${Math.round(hovered.load)} · R ${Math.round(hovered.risk)}` : 'hover a checkpoint'}
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Simulation timeline for availability, load, and risk">
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} stroke="rgb(255 255 255 / 0.06)" strokeWidth="1" />
            <text x={PAD.left - 7} y={y(value) + 3} textAnchor="end" fill="rgb(148 163 184 / 0.7)" fontSize="8" fontFamily="monospace">
              {value}
            </text>
          </g>
        ))}

        {points.map((point) => (
          <text
            key={`x-${point.hour}`}
            x={x(point.hour)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fill="rgb(148 163 184 / 0.7)"
            fontSize="8"
            fontFamily="monospace"
          >
            {point.hour}h
          </text>
        ))}

        {SERIES.map((series) => {
          const d = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.hour).toFixed(1)},${y(point[series.key]).toFixed(1)}`)
            .join(' ');
          return <path key={series.key} d={d} fill="none" stroke={series.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
        })}

        {hovered ? <line x1={x(hovered.hour)} x2={x(hovered.hour)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="rgb(255 255 255 / 0.18)" strokeDasharray="3 3" /> : null}

        {points.map((point, index) => (
          <g key={`point-${index}`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
            <rect x={x(point.hour) - 10} y={PAD.top} width="20" height={usableH} fill="transparent" />
            {SERIES.map((series) => (
              <circle
                key={series.key}
                cx={x(point.hour)}
                cy={y(point[series.key])}
                r={hover === index ? 3.6 : 2}
                fill={series.color}
                stroke="#050a10"
                strokeWidth="1"
              />
            ))}
          </g>
        ))}
      </svg>

      <details className="mt-2 text-[11px] text-ink-muted">
        <summary className="cursor-pointer select-none text-ink-faint hover:text-ink">View timeline data</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[380px] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-1 pr-2">Hour</th>
                <th className="py-1 pr-2">Availability</th>
                <th className="py-1 pr-2">Load</th>
                <th className="py-1">Risk</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.hour} className="border-b border-line/50 last:border-0">
                  <td className="py-1 pr-2 font-mono">{point.hour}</td>
                  <td className="py-1 pr-2 font-mono">{point.availability}</td>
                  <td className="py-1 pr-2 font-mono">{point.load}</td>
                  <td className="py-1 font-mono">{point.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
