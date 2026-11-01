import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: '',
};

describe('digest routes', () => {
  const routes = ['/digest', '/api/digest'] as const;
  const row: DigestRow = {
    job: 'fixtures/refresh',
    owner: 'rook',
    runs: 1,
    retries: 0,
    lastStatus: 'ok',
    lastError: null,
    firstAt: '2026-10-30T01:00:00+01:00',
    lastAt: '2026-10-30T01:00:00+01:00',
  };
  const run = {
    at: row.firstAt,
    job: row.job,
    status: row.lastStatus,
    owner: row.owner,
  };

  it('returns 200 for both digest representations', async () => {
    const runsDir = await mkdtemp(join(process.cwd(), '.digest-route-runs-'));
    await writeFile(join(runsDir, 'complete.jsonl'), JSON.stringify(run) + '\n');

    try {
      for (const route of routes) {
        const response = await createApp({ ...config, runsDir }).request(
          `${route}/complete`,
        );

        expect(response.status).toBe(200);
        if (route === '/digest') {
          expect(response.headers.get('content-type')).toContain('text/html');
          expect(await response.text()).toContain('fixtures/refresh');
        } else {
          expect(response.headers.get('content-type')).toContain('application/json');
          expect(await response.json()).toEqual([row]);
        }
      }
    } finally {
      await rm(runsDir, { recursive: true, force: true });
    }
  });

  it('returns 404 for a missing night on both routes', async () => {
    const runsDir = await mkdtemp(join(process.cwd(), '.digest-route-runs-'));

    try {
      for (const route of routes) {
        expect(
          (await createApp({ ...config, runsDir }).request(`${route}/missing`)).status,
        ).toBe(404);
      }
    } finally {
      await rm(runsDir, { recursive: true, force: true });
    }
  });

  it('renders an empty night on both routes', async () => {
    const runsDir = await mkdtemp(join(process.cwd(), '.digest-route-runs-'));
    await writeFile(join(runsDir, 'empty.jsonl'), '');

    try {
      for (const route of routes) {
        const response = await createApp({ ...config, runsDir }).request(
          `${route}/empty`,
        );

        expect(response.status).toBe(200);
        if (route === '/digest') {
          expect(await response.text()).toContain('nothing ran');
        } else {
          expect(await response.json()).toEqual([]);
        }
      }
    } finally {
      await rm(runsDir, { recursive: true, force: true });
    }
  });

  it('ignores a bad line while serving both routes', async () => {
    const runsDir = await mkdtemp(join(process.cwd(), '.digest-route-runs-'));
    await writeFile(
      join(runsDir, 'with-bad-line.jsonl'),
      `not json\n${JSON.stringify(run)}\n`,
    );

    try {
      for (const route of routes) {
        const response = await createApp({ ...config, runsDir }).request(
          `${route}/with-bad-line`,
        );

        expect(response.status).toBe(200);
        if (route === '/digest') {
          expect(await response.text()).toContain('fixtures/refresh');
        } else {
          expect(await response.json()).toEqual([row]);
        }
      }
    } finally {
      await rm(runsDir, { recursive: true, force: true });
    }
  });
});
