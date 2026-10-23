import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CornerDownLeft, Globe2, Search, Sparkles } from 'lucide-react';

import { NAV_ITEMS, PRODUCT } from '@cyberscape/shared';

import { apiGet, buildQuery } from '../lib/api';
import { cx } from '../lib/format';
import type { CatalogResponse } from '../lib/types';

interface Row {
  id: string;
  kind: 'page' | 'entity';
  label: string;
  hint: string;
  path: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const catalog = useQuery({
    queryKey: ['catalog', 'palette'],
    queryFn: () => apiGet<CatalogResponse>(`/catalog${buildQuery({ pageSize: 100, sort: 'name' })}`),
    enabled: open,
    staleTime: 60_000
  });

  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase();
    const pages: Row[] = NAV_ITEMS.map((item) => ({
      id: `page-${item.to}`,
      kind: 'page' as const,
      label: item.label,
      hint: 'Navigate',
      path: item.to
    })).filter((row) => !needle || row.label.toLowerCase().includes(needle));

    const entities: Row[] = (catalog.data?.items ?? [])
      .filter((entity) => {
        if (!needle) return true;
        return `${entity.name} ${entity.category} ${entity.region} ${entity.tags.join(' ')}`
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 7)
      .map((entity) => ({
        id: `entity-${entity.id}`,
        kind: 'entity',
        label: entity.name,
        hint: `${entity.category} · ${entity.region}`,
        path: `/catalog?entity=${encodeURIComponent(entity.id)}`
      }));

    return [...pages, ...entities];
  }, [catalog.data, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((index) => (rows.length ? (index + 1) % rows.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((index) => (rows.length ? (index - 1 + rows.length) % rows.length : 0));
      } else if (event.key === 'Enter') {
        const row = rows[active];
        if (row) {
          event.preventDefault();
          navigate(row.path);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rows, active, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div className="card relative w-full max-w-xl overflow-hidden shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 text-brand-300" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${PRODUCT.entityLabel}, regions, or pages…`}
            aria-label={`Search ${PRODUCT.entityLabel} and pages`}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">No matches. Try a category or region.</p>
          ) : (
            <ul role="listbox" aria-label="Command results">
              {rows.map((row, index) => (
                <li key={row.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      navigate(row.path);
                      onClose();
                    }}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      index === active ? 'bg-brand-500/12 text-ink' : 'text-ink-muted hover:bg-white/5'
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                        row.kind === 'entity'
                          ? 'border-brand-400/30 bg-brand-400/10 text-brand-300'
                          : 'border-line bg-white/5 text-ink-muted'
                      )}
                    >
                      {row.kind === 'entity' ? <Globe2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{row.label}</span>
                      <span className="block truncate text-[11px] text-ink-faint">{row.hint}</span>
                    </span>
                    {index === active ? <CornerDownLeft className="h-3.5 w-3.5 text-ink-faint" /> : <ArrowRight className="h-3.5 w-3.5 opacity-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10px] text-ink-faint">
          <span>↑ ↓ to move · Enter to open</span>
          <span>{catalog.data ? `${catalog.data.total} ${PRODUCT.entityLabel} indexed` : 'Indexing…'}</span>
        </div>
      </div>
    </div>
  );
}
