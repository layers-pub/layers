/**
 * Abstract base class for scheduled jobs that run on a timer.
 *
 * Subclasses implement {@link BaseJob.run} with their job logic. The base
 * class handles interval scheduling, overlap prevention, error catching,
 * and graceful shutdown.
 *
 * @module
 */

import type { ILogger } from '../types/interfaces/logger.interface.js';
import { createLogger } from '../observability/logger.js';

/**
 * Configuration for constructing a {@link BaseJob}.
 */
interface BaseJobConfig {
  readonly name: string;
  readonly intervalMs: number;
  readonly logger?: ILogger | undefined;
}

/**
 * Abstract base class for interval-based scheduled jobs.
 *
 * Provides start/stop lifecycle, overlap guard, and structured logging.
 * Subclasses implement the {@link run} method with their specific logic.
 *
 * @example
 * ```typescript
 * class StalenessJob extends BaseJob {
 *   async run(): Promise<void> {
 *     await this.detectStaleRecords();
 *   }
 * }
 *
 * const job = new StalenessJob({ name: 'staleness', intervalMs: 60_000 });
 * job.start();
 * ```
 */
abstract class BaseJob {
  protected readonly name: string;
  protected readonly intervalMs: number;
  protected readonly logger: ILogger;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(config: BaseJobConfig) {
    this.name = config.name;
    this.intervalMs = config.intervalMs;
    this.logger = config.logger ?? createLogger({ service: `job:${config.name}` });
  }

  /**
   * Subclasses implement this with their job logic.
   */
  abstract run(): Promise<void>;

  /**
   * Starts the job timer. The first run happens after intervalMs.
   */
  start(): void {
    if (this.timer) return;
    this.logger.info(`Starting job ${this.name} with interval ${String(this.intervalMs)}ms`);
    this.timer = setInterval(() => void this.execute(), this.intervalMs);
  }

  /**
   * Stops the job timer and waits for any in-progress run to complete.
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Wait for current run to complete if one is in progress
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.logger.info(`Stopped job ${this.name}`);
  }

  /**
   * Executes the job with error handling and guard against overlapping runs.
   */
  private async execute(): Promise<void> {
    if (this.running) {
      this.logger.debug(`Skipping ${this.name} run, previous run still in progress`);
      return;
    }
    this.running = true;
    const startTime = Date.now();
    try {
      await this.run();
      const durationMs = Date.now() - startTime;
      this.logger.debug(`Job ${this.name} completed in ${String(durationMs)}ms`);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Job ${this.name} failed`, { error: error.message });
    } finally {
      this.running = false;
    }
  }
}

export { BaseJob };
export type { BaseJobConfig };
