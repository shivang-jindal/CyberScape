import { useId, useMemo } from 'react';

import { createRng, hashSeed } from '../lib/generate';

interface Node {
  x: number;
  y: number;
  r: number;
}

/**
 * Deterministic network globe: a sphere with seeded nodes, peering arcs, and a
 * status-coloured signal ring. The same seed always renders the same topology.
 */
export function WorldGlobe({
  seed,
  status = 'nominal',
  className = ''
}: {
  seed: string;
  status?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const rngSeed = hashSeed(seed);

  const scene = useMemo(() => {
    const rng = createRng(rngSeed);
    const nodes: Node[] = Array.from({ length: 11 }, () => {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * 62;
      return {
        x: 100 + Math.cos(angle) * radius,
        y: 100 + Math.sin(angle) * radius * 0.92,
        r: 1.2 + rng() * 1.8
      };
    });
    const arcs = nodes.slice(0, 8).map((node, index) => {
      const target = nodes[(index + 3) % nodes.length] ?? nodes[0]!;
      const mx = (node.x + target.x) / 2 + (rng() - 0.5) * 24;
      const my = (node.y + target.y) / 2 + (rng() - 0.5) * 24;
      return {
        path: `M${node.x.toFixed(2)},${node.y.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${target.x.toFixed(2)},${target.y.toFixed(2)}`,
        opacity: 0.24 + rng() * 0.34
      };
    });
    const stars = Array.from({ length: 32 }, () => ({
      x: 8 + rng() * 184,
      y: 8 + rng() * 184,
      r: 0.2 + rng() * 0.55,
      o: 0.15 + rng() * 0.55
    }));
    return { nodes, arcs, stars };
  }, [rngSeed]);

  const critical = status === 'critical' || status === 'anomalous' || status === 'compromised' || status === 'endangered';
  const warning =
    status === 'degraded' || status === 'evolving' || status === 'vulnerable' || status === 'drifting';
  const accent = critical ? '#fb7185' : warning ? '#fbbf24' : 'var(--color-brand-300)';
  const accentSoft = critical ? '#7f1d3a' : warning ? '#78350f' : 'var(--color-brand-900)';

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`Seeded network globe for ${seed}`}>
      <defs>
        <radialGradient id={`sphere-${uid}`} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor={accentSoft} />
          <stop offset="48%" stopColor="#083344" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={`halo-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="58%" stopColor={accent} stopOpacity="0.2" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx="100" cy="100" r="76" />
        </clipPath>
      </defs>

      {scene.stars.map((star, index) => (
        <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#e2e8f0" opacity={star.o} />
      ))}

      <circle cx="100" cy="100" r="96" fill={`url(#halo-${uid})`} />
      <circle cx="100" cy="100" r="76" fill={`url(#sphere-${uid})`} stroke={accent} strokeOpacity="0.38" strokeWidth="0.7" />

      <g clipPath={`url(#clip-${uid})`}>
        {[-58, -29, 0, 29, 58].map((lat) => {
          const y = 100 - (lat / 90) * 76;
          const half = Math.sqrt(Math.max(0, 76 * 76 - (y - 100) * (y - 100)));
          return (
            <line
              key={lat}
              x1={100 - half}
              x2={100 + half}
              y1={y}
              y2={y}
              stroke="var(--color-brand-300)"
              strokeOpacity="0.12"
              strokeWidth="0.4"
            />
          );
        })}
        {[15, 30, 45, 60, 75].map((lon) => (
          <ellipse
            key={lon}
            cx="100"
            cy="100"
            rx={Math.max(0.4, Math.abs(Math.cos((lon * Math.PI) / 180)) * 76)}
            ry="76"
            fill="none"
            stroke="var(--color-brand-300)"
            strokeOpacity="0.1"
            strokeWidth="0.4"
          />
        ))}

        {scene.arcs.map((arc, index) => (
          <path
            key={index}
            d={arc.path}
            fill="none"
            stroke={accent}
            strokeOpacity={arc.opacity}
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        ))}

        {scene.nodes.map((node, index) => (
          <g key={index}>
            <circle cx={node.x} cy={node.y} r={node.r} fill={accent} />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 2.4}
              fill="none"
              stroke={accent}
              strokeOpacity="0.35"
              strokeWidth="0.4"
            />
          </g>
        ))}
      </g>

      <ellipse
        cx="100"
        cy="100"
        rx="90"
        ry="26"
        fill="none"
        stroke={accent}
        strokeOpacity="0.2"
        strokeWidth="0.6"
        transform="rotate(-18 100 100)"
      />
      <circle cx="176" cy="74" r="1.8" fill={accent} opacity="0.85" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={accent} strokeOpacity="0.15" strokeWidth="0.5" />
    </svg>
  );
}
