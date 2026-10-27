import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WorkspaceStore } from '../src/store/workspaceStore.js';

describe('workspace disk persistence', () => {
  it('reloads projects and scenario reports from the configured file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cyberscape-workspace-'));
    const file = join(directory, 'workspace.json');
    try {
      const first = new WorkspaceStore(file, false);
      const project = await first.create({ name: 'Persistence check', seed: 'seed-17', notes: 'Keep the study context.' });
      await first.addRun(project.id, 'Scenario report', { seed: project.seed, impactScore: 31 });
      const second = new WorkspaceStore(file, false);
      const loaded = await second.list();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toMatchObject({ name: project.name, seed: project.seed, notes: project.notes });
      expect(loaded[0]?.runs[0]?.result).toEqual({ seed: 'seed-17', impactScore: 31 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
