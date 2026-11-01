import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

describe('digest routes', () => {
  it('returns the sorted digest rows as JSON', async () => {
    const app = createApp(config);
    const response = await app.request('/api/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual([
      expect.objectContaining({ job: 'digest/render' }),
      expect.objectContaining({ job: 'fixtures/refresh' }),
      expect.objectContaining({ job: 'lane/sync' }),
      expect.objectContaining({ job: 'notes/backup' }),
      expect.objectContaining({ job: 'rig/rotate-logs' }),
    ]);
  });

  it('keeps missing-night behavior aligned with the page', async () => {
    const app = createApp(config);

    expect((await app.request('/api/digest/missing')).status).toBe(404);
    expect((await app.request('/digest/missing')).status).toBe(404);
  });
});
