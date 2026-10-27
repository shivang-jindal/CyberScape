import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Download, Radio } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { downloadJson } from '../lib/format';
import { ErrorNote, Panel, SectionHeading, Spinner, StatCard } from '../components/ui';

type Project = { id: string; name: string };
type Snapshot = { resource: string; observedAt: string | null; fetchedAt: string; routeCount: number; sampledRoutes: number; uniquePrefixes: number; originCounts: Array<{ asn: string; routes: number }>; peerCounts: Array<{ peer: string; routes: number }>; routes: Array<{ prefix: string | null; path: string[]; peer: string | null; originAs: string | null }>; source: { name: string; url: string; coverage: string } };

export function NetworkObservationsPage() {
  const [resource, setResource] = useState('AS13335');
  const [projectId, setProjectId] = useState('');
  const projects = useQuery({ queryKey: ['workspaces'], queryFn: () => apiGet<{ projects: Project[] }>('/workspaces') });
  const query = useMutation({ mutationFn: () => apiPost<{ snapshot: Snapshot; saved: boolean }>('/network/bgp-state', { resource, ...(projectId ? { projectId } : {}) }) });
  const snapshot = query.data?.snapshot;
  return <div className="space-y-5">
    <SectionHeading eyebrow="RIPE RIS observations" title="Inspect observed BGP routes" description="Fetch a current routing view for an autonomous system from RIPE NCC RIS collectors. Collector coverage is partial and varies over time." />
    <Panel title="Observation request" description="Enter an AS number to retrieve route state observed by RIPE RIS.">
      <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); query.mutate(); }}>
        <label className="label">Autonomous system<input className="input mt-1 font-mono" value={resource} onChange={(event) => setResource(event.target.value)} placeholder="AS13335" pattern="(AS)?[0-9]{1,10}" required /></label>
        <label className="label">Save observation to<select className="input mt-1" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Do not save</option>{projects.data?.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <button className="btn btn-primary" disabled={query.isPending}>{query.isPending ? <Spinner label="Fetching routes…" /> : <><Radio className="h-4 w-4" />Fetch observed routes</>}</button>
      </form>
    </Panel>
    {query.isError ? <ErrorNote message={(query.error as Error).message} onRetry={() => query.mutate()} /> : null}
    {snapshot ? <>
      <div className="grid gap-3 md:grid-cols-3"><StatCard label="Routes reported" value={snapshot.routeCount.toLocaleString()} hint="Provider reported count" icon={<Activity className="h-4 w-4" />} /><StatCard label="Distinct prefixes" value={snapshot.uniquePrefixes.toLocaleString()} hint="Prefixes in returned route set" /><StatCard label="Returned samples" value={snapshot.sampledRoutes.toLocaleString()} hint="Up to 250 routes shown" /></div>
      <Panel title={`${snapshot.resource} · BGP snapshot`} description={`Provider query time: ${snapshot.observedAt ?? 'not supplied'} · Retrieved: ${new Date(snapshot.fetchedAt).toLocaleString()}`} actions={<button className="btn text-xs" onClick={() => downloadJson(`bgp-${snapshot.resource.toLowerCase()}-${snapshot.fetchedAt.slice(0, 10)}.json`, snapshot)}><Download className="h-3.5 w-3.5" />Export JSON</button>}>
        <div className="mb-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100/80">{snapshot.source.coverage} Counts and paths are observations from this provider response, not a complete global routing view or a hijack determination.</div>
        <div className="grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Frequent origins in response</h3><ul className="space-y-1">{snapshot.originCounts.map((item) => <li key={item.asn} className="flex justify-between rounded border border-line px-2 py-1.5 text-xs"><span className="font-mono">AS{item.asn}</span><span>{item.routes} routes</span></li>)}</ul></div><div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Collector peers in response</h3><ul className="space-y-1">{snapshot.peerCounts.map((item) => <li key={item.peer} className="flex justify-between rounded border border-line px-2 py-1.5 text-xs"><span className="font-mono">{item.peer}</span><span>{item.routes} routes</span></li>)}</ul></div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-ink-faint"><tr><th className="p-2">Prefix</th><th className="p-2">Origin AS</th><th className="p-2">Peer</th><th className="p-2">Observed path</th></tr></thead><tbody>{snapshot.routes.map((route, index) => <tr key={`${route.prefix}-${index}`} className="border-t border-line"><td className="p-2 font-mono">{route.prefix ?? '—'}</td><td className="p-2 font-mono">{route.originAs ? `AS${route.originAs}` : '—'}</td><td className="p-2 font-mono">{route.peer ?? '—'}</td><td className="max-w-lg break-all p-2 font-mono">{route.path.map((asn) => `AS${asn}`).join(' → ') || '—'}</td></tr>)}</tbody></table></div>
        <a className="mt-3 inline-block text-xs text-brand-300 underline" href={snapshot.source.url} target="_blank" rel="noreferrer">{snapshot.source.name} documentation</a>
      </Panel>
    </> : <Panel><p className="py-6 text-center text-sm text-ink-muted">Submit an AS number to inspect RIPE RIS route observations. The legacy atlas and outage simulator remain fictional tabletop examples.</p></Panel>}
  </div>;
}
