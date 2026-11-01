import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DigestRow, RunCounts, RunStatus } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

function isRunStatus(value: unknown): value is RunStatus {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

function parseRunRecord(value: unknown): RunRecord | null {
  if (typeof value !== 'object' || value === null) return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.at !== 'string' ||
    typeof record.job !== 'string' ||
    !isRunStatus(record.status) ||
    (typeof record.owner !== 'string' && record.owner !== null)
  ) {
    return null;
  }

  if (record.error !== undefined && typeof record.error !== 'string') {
    return null;
  }

  return {
    at: record.at,
    job: record.job,
    status: record.status,
    owner: record.owner,
    error: record.error ?? null,
  };
}

async function readRuns(runsDir: string, night: string): Promise<RunRecord[]> {
  let contents: string;
  try {
    contents = await readFile(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return [];
  }

  const runs: RunRecord[] = [];

  for (const line of contents.split(/\r?\n/)) {
    if (line.trim() === '') continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      continue;
    }

    const run = parseRunRecord(parsed);
    if (run === null) {
      continue;
    }

    runs.push(run);
  }

  return runs;
}

export async function readNight(runsDir: string, night: string): Promise<DigestRow[]> {
  const rows = new Map<string, DigestRow>();

  for (const run of await readRuns(runsDir, night)) {
    const existing = rows.get(run.job);
    if (existing === undefined) {
      rows.set(run.job, {
        job: run.job,
        owner: run.owner,
        runs: 1,
        retries: run.status === 'retry' ? 1 : 0,
        lastStatus: run.status,
        lastError: run.error,
        firstAt: run.at,
        lastAt: run.at,
      });
      continue;
    }

    existing.runs += 1;
    if (run.status === 'retry') existing.retries += 1;
    existing.lastStatus = run.status;
    existing.lastError = run.error;
    existing.lastAt = run.at;
    existing.owner = run.owner;
  }

  return [...rows.values()];
}

export async function readNightCounts(runsDir: string, night: string): Promise<RunCounts> {
  const counts: RunCounts = { ok: 0, retry: 0, fail: 0 };

  for (const run of await readRuns(runsDir, night)) {
    counts[run.status] += 1;
  }

  return counts;
}

export async function readDigest(
  runsDir: string,
  night: string,
): Promise<DigestRow[] | null> {
  try {
    await access(join(runsDir, `${night}.jsonl`));
  } catch {
    return null;
  }

  return (await readNight(runsDir, night)).sort((a, b) => a.job.localeCompare(b.job));
}
