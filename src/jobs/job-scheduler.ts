/**
 * Manages all registered scheduled jobs.
 *
 * The scheduler provides a single point of control for starting and
 * stopping all interval-based jobs in the API server process.
 *
 * @module
 */

import type { ILogger } from '../types/interfaces/logger.interface.js';
import { createLogger } from '../observability/logger.js';
import type { BaseJob } from './base-job.js';

/**
 * Configuration for constructing a {@link JobScheduler}.
 */
interface JobSchedulerConfig {
  readonly logger?: ILogger | undefined;
}

/**
 * Manages registered {@link BaseJob} instances, providing batch start/stop.
 *
 * @example
 * ```typescript
 * const scheduler = new JobScheduler();
 * scheduler.register(new StalenessJob({ name: 'staleness', intervalMs: 60_000 }));
 * scheduler.register(new ReconciliationJob({ name: 'reconciliation', intervalMs: 300_000 }));
 * scheduler.startAll();
 *
 * // On shutdown:
 * await scheduler.stopAll();
 * ```
 */
class JobScheduler {
  private readonly jobs: BaseJob[] = [];
  private readonly logger: ILogger;

  constructor(config?: JobSchedulerConfig) {
    this.logger = config?.logger ?? createLogger({ service: 'job-scheduler' });
  }

  /**
   * Registers a job to be managed by this scheduler.
   *
   * @param job - the job instance to register
   */
  register(job: BaseJob): void {
    this.jobs.push(job);
  }

  /**
   * Starts all registered jobs.
   */
  startAll(): void {
    this.logger.info(`Starting ${String(this.jobs.length)} scheduled jobs`);
    for (const job of this.jobs) {
      job.start();
    }
  }

  /**
   * Stops all registered jobs and waits for in-progress runs to complete.
   */
  async stopAll(): Promise<void> {
    this.logger.info('Stopping all scheduled jobs');
    await Promise.all(this.jobs.map((job) => job.stop()));
    this.logger.info('All scheduled jobs stopped');
  }
}

export { JobScheduler };
export type { JobSchedulerConfig };
