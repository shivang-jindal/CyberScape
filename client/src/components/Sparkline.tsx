import { useId, useMemo } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showDots?: boolean;
  min?: number;
  max?: number;
  label: string;
}

function buildPath(values: number[], width: number, height: number, padding: number, min: number, max: number) {
  if (values.length === 0) return { line: '', area: '', points: [] as Array<{ x: number; y: number }> };
  const span = Math.max(1, max - min);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const points = values.map((value, index) => {
    const x = padding + (values.length === 1 ? usableWidth / 2 : (index / (values.length - 1)) * usableWidth);
    const y = padding + usableHeight - ((value - min) / span) * usableHeight;
    return { x, y };
  });
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const area = `${line} L${points[points.length - 1]?.x.toFixed(2)},${(height - padding).toFixed(2)} L${points[0]?.x.toFixed(2)},${(height - padding).toFixed(2)} Z`;
  return { line, area, points };
}

export function Sparkline({
  values,
  width = 260,
  height = 64,
  stroke = 'rgb(52 211 153)',
  fill = 'rgb(52 211 153)',
  showDots = false,
  min,
  max,
  label
}: SparklineProps) {
  const gradientId = useId().replace(/:/g, '');
  const domain = useMemo(() => {
    const low = min ?? Math.min(...values);
    const high = max ?? Math.max(...values);
    if (values.length === 0) return { low: 0, high: 1 };
    return high === low ? { low: low - 1, high: high + 1 } : { low, high };
  }, [values, min, max]);
  const padding = 5;
  const { line, area, points } = buildPath(values, width, height, padding, domain.low, domain.high);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.28" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          x2={width - padding}
          y1={padding + (height - padding * 2) * ratio}
          y2={padding + (height - padding * 2) * ratio}
          stroke="rgb(255 255 255 / 0.05)"
          strokeWidth="1"
        />
      ))}
      {area ? <path d={area} fill={`url(#spark-${gradientId})`} /> : null}
      {line ? <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /> : null}
      {showDots
        ? points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="2" fill={stroke} stroke="rgb(9 14 20)" strokeWidth="1" />
          ))
        : null}
    </svg>
  );
}
