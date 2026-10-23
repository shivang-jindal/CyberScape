import { describe, expect, it } from 'vitest';

import { configSchema, loadConfig } from '../src/config.js';

describe('config', () => {
  it('applies safe defaults', () => {
    const config = configSchema.parse({});
    expect(config.PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('coerces numeric environment variables', () => {
    const config = loadConfig({ PORT: '8080', RATE_LIMIT_MAX: '42' } as NodeJS.ProcessEnv);
    expect(config.PORT).toBe(8080);
    expect(config.RATE_LIMIT_MAX).toBe(42);
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '-1' } as NodeJS.ProcessEnv)).toThrow();
  });

  it('rejects an unknown environment', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' } as NodeJS.ProcessEnv)).toThrow();
  });
});
