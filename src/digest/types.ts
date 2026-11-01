export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunCounts = Record<RunStatus, number>;

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};
