import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Command,
  FlaskConical,
  FolderKanban,
  Github,
  Globe2,
  LayoutDashboard,
  Menu,
  Network as NetworkIcon,
  Network,
  Settings as SettingsIcon,
  Sparkles,
  X
} from 'lucide-react';

import { NAV_ITEMS, PRODUCT } from '@cyberscape/shared';

import { apiGet } from '../lib/api';
import { cx } from '../lib/format';
import type { VersionResponse } from '../lib/types';
import { useAppStore } from '../store/appStore';
import { CommandPalette } from './CommandPalette';

const ICONS = {
  overview: LayoutDashboard,
  catalog: Globe2,
  network: NetworkIcon,
  simulator: FlaskConical,
  projects: FolderKanban,
  assistant: Sparkles,
  settings: SettingsIcon
} as const;

const PATH_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/catalog': PRODUCT.catalogueName,
  '/network': 'Observed BGP routes',
  '/simulator': 'Simulation lab',
  '/workspaces': 'Network studies',
  '/assistant': PRODUCT.assistantNameTitle,
  '/settings': 'Workspace settings'
};

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const density = useAppStore((state) => state.density);
  const setDensity = useAppStore((state) => state.setDensity);
  const reduceMotion = useAppStore((state) => state.reduceMotion);

  const version = useQuery({
    queryKey: ['version'],
    queryFn: () => apiGet<VersionResponse>('/version'),
    staleTime: 5 * 60_000,
    retry: 1
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key === '/' && !paletteOpen) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen]);

  const online = version.isSuccess;
  const pageTitle = PATH_TITLES[location.pathname] ?? PRODUCT.name;

  return (
    <div className="min-h-screen text-ink">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface-sunken/95 backdrop-blur lg:flex',
          collapsed ? 'w-[76px]' : 'w-64'
        )}
      >
        <div className={cx('flex h-16 items-center gap-2.5 border-b border-line px-4', collapsed && 'justify-center px-2')}>
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_0_24px_-4px_var(--color-brand-500)]">
            <Network className="h-5 w-5 text-[#04141d]" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-300 ring-2 ring-surface-sunken" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-ink">{PRODUCT.name}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{PRODUCT.engineLabel}</p>
            </div>
          ) : null}
        </div>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Globe2;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cx(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-brand-500/10 text-brand-200'
                      : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? <span className="absolute left-0 h-5 w-0.5 rounded-full bg-brand-400" /> : null}
                    <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="border-t border-line p-3">
            <div className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Engine</span>
                <span
                  className={cx(
                    'inline-flex items-center gap-1 text-[10px] font-semibold',
                    online ? 'text-emerald-300' : 'text-amber-300'
                  )}
                >
                  <span className={cx('h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-amber-400')} />
                  {online ? 'online' : 'offline'}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                {version.data ? `${version.data.name} v${version.data.version}` : 'waiting for api…'}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-faint">deterministic · saved on this server</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-line p-2">
          <a
            href={`https://github.com/shivang-jindal/${PRODUCT.repo}`}
            target="_blank"
            rel="noreferrer"
            className={cx('btn btn-ghost px-2', collapsed && 'w-full')}
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" />
            {!collapsed ? <span className="text-xs">Source</span> : null}
          </a>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="btn btn-ghost px-2"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className={cx('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-line bg-surface-sunken/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="btn btn-ghost px-2 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                {PRODUCT.tagline.split('—')[0]?.trim()}
              </p>
              <h1 className="truncate text-sm font-semibold text-ink">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted transition-colors hover:border-brand-400/40 hover:text-ink sm:flex"
                aria-label="Open command palette"
              >
                <Command className="h-3.5 w-3.5" />
                <span>Jump to…</span>
                <kbd className="ml-2 rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                  Ctrl K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="btn btn-ghost px-2 sm:hidden"
                aria-label="Open command palette"
              >
                <Command className="h-4 w-4" />
              </button>

              <div className="hidden items-center gap-1 rounded-lg border border-line bg-surface p-0.5 md:flex" role="group" aria-label="Card density">
                {(['comfortable', 'compact'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDensity(mode)}
                    aria-pressed={density === mode}
                    className={cx(
                      'rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                      density === mode ? 'bg-brand-500/15 text-brand-200' : 'text-ink-faint hover:text-ink'
                    )}
                  >
                    {mode === 'comfortable' ? 'Comfy' : 'Compact'}
                  </button>
                ))}
              </div>

              <span
                className={cx(
                  'hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex',
                  online
                    ? 'border-emerald-400/25 bg-emerald-400/5 text-emerald-200'
                    : 'border-amber-400/25 bg-amber-400/5 text-amber-200'
                )}
                title={online ? 'API reachable' : 'API not reachable'}
              >
                <Activity className="h-3 w-3" />
                {online ? 'linked' : 'demo'}
              </span>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-line px-4 py-4 text-[11px] text-ink-faint sm:px-6">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {PRODUCT.name} · {PRODUCT.tagline}
            </span>
            <span className="font-mono">MIT © 2026 Shivang Jindal</span>
          </div>
        </footer>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface-sunken p-4" aria-label="Mobile navigation">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                  <Network className="h-4 w-4 text-[#04141d]" />
                </div>
                <span className="text-sm font-semibold">{PRODUCT.name}</span>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="btn btn-ghost px-2" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Globe2;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive ? 'bg-brand-500/12 text-brand-200' : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-6 rounded-xl border border-line bg-surface p-3 text-xs text-ink-muted">
              <p className="font-semibold text-ink">{PRODUCT.tagline}</p>
              <p className="mt-1">Same seed, same {PRODUCT.entitySingular} — on every machine.</p>
            </div>
          </nav>
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
