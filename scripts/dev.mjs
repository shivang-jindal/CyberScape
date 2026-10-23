#!/usr/bin/env node
/**
 * Development launcher: runs the API and the Vite dev server together with
 * prefixed output. Ctrl+C stops both.
 *
 * Usage: npm run dev
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const tasks = [
  { name: 'api', color: '\u001b[36m', args: ['run', 'dev:server'] },
  { name: 'web', color: '\u001b[32m', args: ['run', 'dev:client'] },
];

const children = [];
let shuttingDown = false;

function prefixStream(stream, name, color) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      process.stdout.write(`${color}${name}\u001b[0m | ${line}\n`);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 500).unref();
}

for (const task of tasks) {
  const child = spawn(npm, task.args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: true,
  });
  prefixStream(child.stdout, task.name, task.color);
  prefixStream(child.stderr, task.name, task.color);
  child.on('exit', (code) => {
    if (shuttingDown) return;
    process.stderr.write(`${task.color}${task.name}\u001b[0m exited with code ${code}. Stopping everything.\n`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.stdout.write(
  [
    'CyberScape development stack starting.',
    '  web   http://localhost:5173',
    '  api   http://localhost:4000/health',
    '',
  ].join('\n'),
);
