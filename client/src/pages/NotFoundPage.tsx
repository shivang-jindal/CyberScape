import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';

import { PRODUCT, STATUSES } from '@cyberscape/shared';

import { WorldGlobe } from '../components/WorldGlobe';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card relative w-full max-w-lg overflow-hidden p-6 text-center">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
        <div className="relative">
          <div className="mx-auto h-40 w-40 opacity-80">
            <WorldGlobe
              seed="lost-seed"
              status={STATUSES[STATUSES.length - 1] ?? 'critical'}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-rose-300">404 · uncharted</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">This seed has no {PRODUCT.entitySingular}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
            The route you followed is not in the catalogue. It may have been forked, renamed, or never generated.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn btn-primary">
              <Home className="h-4 w-4" />
              Back to overview
            </Link>
            <Link to="/catalog" className="btn">
              <Compass className="h-4 w-4" />
              Browse {PRODUCT.entityLabel}
            </Link>
            <Link to="/assistant" className="btn btn-ghost">
              <Search className="h-4 w-4" />
              Ask the {PRODUCT.assistantName}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
