import { GitCompareArrows, Heart, MapPin } from 'lucide-react';

import { METRICS, type CatalogEntity } from '@cyberscape/shared';

import { cx } from '../lib/format';
import { WorldGlobe } from './WorldGlobe';
import { MetricBar, RiskMeter, StatusBadge } from './ui';

export function WorldCard({
  entity,
  risk,
  density,
  favorite,
  compared,
  compareDisabled,
  onOpen,
  onToggleFavorite,
  onToggleCompare
}: {
  entity: CatalogEntity;
  risk: number;
  density: 'comfortable' | 'compact';
  favorite: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
}) {
  const metrics = METRICS.slice(0, 3);

  return (
    <article
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${entity.name}`}
      className={cx(
        'card card-hover group relative flex cursor-pointer flex-col overflow-hidden',
        density === 'compact' ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            'shrink-0 overflow-hidden rounded-xl border border-line bg-slate-950',
            density === 'compact' ? 'h-14 w-14' : 'h-20 w-20'
          )}
        >
          <WorldGlobe seed={entity.id} status={entity.status} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={entity.status} />
            <span className="chip">{entity.category}</span>
          </div>
          <h3 className={cx('mt-2 font-semibold tracking-tight text-ink', density === 'compact' ? 'text-sm' : 'text-base')}>
            {entity.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
            <MapPin className="h-3 w-3" />
            {entity.region}
          </p>
        </div>
        <RiskMeter score={risk} size={density === 'compact' ? 44 : 50} />
      </div>

      {density === 'comfortable' ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-muted">{entity.summary}</p> : null}

      <div className={cx('mt-auto grid gap-2', density === 'compact' ? 'mt-2' : 'mt-3')}>
        {metrics.map((metric) => (
          <MetricBar key={metric.key} metric={metric} value={entity.metrics[metric.key] ?? 0} compact={density === 'compact'} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <div className="flex flex-wrap gap-1">
          {entity.tags.slice(0, density === 'compact' ? 1 : 2).map((tag) => (
            <span key={tag} className="text-[10px] text-ink-faint">
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            className={cx('rounded-md p-1.5 transition-colors hover:bg-white/5', favorite ? 'text-rose-300' : 'text-ink-faint')}
            aria-label={favorite ? `Remove ${entity.name} from favourites` : `Add ${entity.name} to favourites`}
            aria-pressed={favorite}
          >
            <Heart className={cx('h-3.5 w-3.5', favorite && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCompare();
            }}
            disabled={compareDisabled && !compared}
            className={cx(
              'rounded-md p-1.5 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30',
              compared ? 'text-brand-300' : 'text-ink-faint'
            )}
            aria-label={compared ? `Remove ${entity.name} from comparison` : `Add ${entity.name} to comparison`}
            aria-pressed={compared}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
