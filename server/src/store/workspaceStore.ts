import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export interface StudyProject {
  id: string; name: string; seed: string; notes: string;
  createdAt: string; updatedAt: string;
  runs: Array<{ id: string; scenario: string; result: unknown; createdAt: string }>;
}
interface StoreFile { version: 1; projects: StudyProject[] }
const STORE_PATH = process.env.WORKSPACE_FILE ?? fileURLToPath(new URL('../../../.data/workspaces.json', import.meta.url));
const EMPTY: StoreFile = { version: 1, projects: [] };

export class WorkspaceStore {
  private queue: Promise<unknown> = Promise.resolve();
  private memoryState: StoreFile = { version: 1, projects: [] };
  constructor(private readonly path = STORE_PATH, private readonly memory = process.env.NODE_ENV === 'test') {}

  private async read(): Promise<StoreFile> {
    if (this.memory) return this.memoryState;
    try {
      const data: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (typeof data === 'object' && data !== null && 'version' in data &&
          (data as StoreFile).version === 1 && Array.isArray((data as StoreFile).projects)) return data as StoreFile;
      throw new Error('Workspace file has an unsupported format');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY;
      throw error;
    }
  }
  private async write(state: StoreFile): Promise<void> {
    if (this.memory) { this.memoryState = state; return; }
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(tmp, this.path);
  }
  private async update<T>(fn: (state: StoreFile) => T): Promise<T> {
    const task = this.queue.then(async () => { const state = await this.read(); const result = fn(state); await this.write(state); return result; });
    this.queue = task.catch(() => undefined);
    return task;
  }
  async list(): Promise<StudyProject[]> { await this.queue; return (await this.read()).projects; }
  async create(input: { name: string; seed: string; notes: string }): Promise<StudyProject> {
    return this.update((state) => {
      if (state.projects.length >= 200) throw Object.assign(new Error('This server has reached its 200-project limit.'), { statusCode: 409, code: 'PROJECT_LIMIT_REACHED' });
      const now = new Date().toISOString();
      const project = { id: randomUUID(), ...input, createdAt: now, updatedAt: now, runs: [] };
      state.projects.unshift(project); return project;
    });
  }
  async addRun(id: string, scenario: string, result: unknown): Promise<StudyProject> {
    return this.update((state) => {
      const project = state.projects.find((item) => item.id === id);
      if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404, code: 'PROJECT_NOT_FOUND' });
      if (project.runs.length >= 250) throw Object.assign(new Error('This project has reached its 250-run limit.'), { statusCode: 409, code: 'RUN_LIMIT_REACHED' });
      const now = new Date().toISOString();
      project.runs.unshift({ id: randomUUID(), scenario, result, createdAt: now });
      project.updatedAt = now; return project;
    });
  }
  async remove(id: string): Promise<void> {
    await this.update((state) => {
      const index = state.projects.findIndex((item) => item.id === id);
      if (index < 0) throw Object.assign(new Error('Project not found'), { statusCode: 404, code: 'PROJECT_NOT_FOUND' });
      state.projects.splice(index, 1);
    });
  }
}
export const workspaceStore = new WorkspaceStore();
