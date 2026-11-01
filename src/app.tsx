import { Hono } from 'hono';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', async (c) => {
    const night = c.req.param('night');

    try {
      await access(join(config.runsDir, `${night}.jsonl`));
    } catch {
      return c.notFound();
    }

    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={night} rows={await readNight(config.runsDir, night)} />
      </Layout>,
    );
  });

  return app;
}
