#!/usr/bin/env node
/**
 * Post-deployment smoke test. Walks the primary journeys against a running API
 * and exits non-zero on the first failure.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 */

const baseUrl = process.argv[2] ?? process.env.SMOKE_API_URL ?? 'http://localhost:4000';

async function call(method, path, body) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json };
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${label}${detail ? ` - ${detail}` : ''}`);
  } else {
    console.error(`  FAIL ${label}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

const health = await fetch(`${baseUrl}/health`);
const healthJson = await health.json();
check('health', health.status === 200 && healthJson.status === 'ok');

const version = await call('GET', '/version');
check('version', version.status === 200 && version.json?.name === 'CyberScape');

const capabilities = await call('GET', '/capabilities');
check('capabilities', capabilities.status === 200 && capabilities.json?.categories?.length > 0);

const catalog = await call('GET', '/catalog?pageSize=5');
check('catalogue', catalog.status === 200 && catalog.json?.items?.length === 5 && catalog.json?.total > 0);

const first = catalog.json?.items?.[0];
check('catalogue rows are complete', Boolean(first?.id && first?.name && first?.metrics));

if (first) {
  const detail = await call('GET', `/catalog/${first.id}`);
  check('entity detail', detail.status === 200 && detail.json?.history?.length === 12);

  const simulation = await call('POST', '/simulate', {
    action: 'cable_cut',
    targetId: first.id,
    intensity: 0.7,
    horizonHours: 24,
  });
  check('simulation', simulation.status === 201 && simulation.json?.timeline?.length === 7);
}

const summary = await call('GET', '/analytics/summary');
check('analytics', summary.status === 200 && summary.json?.topRisks?.length > 0);

const share = await call('POST', '/share-links', { entityId: first?.id });
check('share link creation', share.status === 201 && Boolean(share.json?.token));
if (share.json?.token) {
  const decoded = await call('GET', `/share-links/${share.json.token}`);
  check('share link decoding', decoded.status === 200 && decoded.json?.payload?.entityId === first?.id);
}

const chat = await call('POST', '/ai/chat', { message: 'Which assets are most at risk?' });
check('assistant', chat.status === 200 && Boolean(chat.json?.message) && chat.json?.actions?.length > 0);

const missing = await call('GET', '/does-not-exist');
check('unknown routes return a structured 404', missing.status === 404 && missing.json?.error?.code === 'NOT_FOUND');

console.log(process.exitCode ? '\nSmoke test FAILED' : '\nSmoke test passed');
