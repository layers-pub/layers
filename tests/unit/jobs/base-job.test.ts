/**
 * Unit tests for the BaseJob abstract class.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseJob } from '@/jobs/base-job.js';
import { createMockLogger } from '@tests/helpers/record-type-test-helpers.js';

/**
 * Concrete test subclass of BaseJob for testing purposes.
 */
class TestJob extends BaseJob {
  runCount = 0;
  runDuration = 0;
  shouldThrow = false;

  async run(): Promise<void> {
    this.runCount++;
    if (this.runDuration > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.runDuration));
    }
    if (this.shouldThrow) {
      throw new Error('Test job failure');
    }
  }
}

describe('BaseJob', () => {
  let job: TestJob;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = createMockLogger();
    job = new TestJob({ name: 'test-job', intervalMs: 1000, logger });
  });

  afterEach(async () => {
    await job.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('creates a timer that calls run after intervalMs', async () => {
      job.start();
      expect(job.runCount).toBe(0);

      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(2);
    });

    it('does not create a second timer if already started', async () => {
      job.start();
      job.start();

      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(1);
    });

    it('logs a start message', () => {
      job.start();
      expect(logger.info).toHaveBeenCalledWith('Starting job test-job with interval 1000ms');
    });
  });

  describe('stop', () => {
    it('clears the timer so run is no longer called', async () => {
      job.start();
      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(1);

      await job.stop();
      await vi.advanceTimersByTimeAsync(5000);
      expect(job.runCount).toBe(1);
    });

    it('logs a stop message', async () => {
      job.start();
      await job.stop();
      expect(logger.info).toHaveBeenCalledWith('Stopped job test-job');
    });

    it('waits for an in-progress run to complete', async () => {
      vi.useRealTimers();

      const realLogger = createMockLogger();
      const slowJob = new TestJob({ name: 'slow-job', intervalMs: 50, logger: realLogger });
      slowJob.runDuration = 200;

      slowJob.start();

      // Wait for the first tick to fire and start executing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // stop() should wait for the in-progress run
      await slowJob.stop();

      // The run should have completed (not been interrupted)
      expect(slowJob.runCount).toBe(1);
    });
  });

  describe('overlap guard', () => {
    it('skips a run if the previous run is still in progress', async () => {
      vi.useRealTimers();

      const overlapLogger = createMockLogger();
      const overlapJob = new TestJob({
        name: 'overlap-job',
        intervalMs: 50,
        logger: overlapLogger,
      });
      overlapJob.runDuration = 200;

      overlapJob.start();

      // Wait for the first tick to fire (50ms) and the second tick (100ms)
      // The first run takes 200ms, so the second tick should be skipped
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(overlapJob.runCount).toBe(1);
      expect(overlapLogger.debug).toHaveBeenCalledWith(
        'Skipping overlap-job run, previous run still in progress',
      );

      // Wait for the in-progress run to finish before stopping
      await new Promise((resolve) => setTimeout(resolve, 200));
      await overlapJob.stop();
    });
  });

  describe('error handling', () => {
    it('catches errors in run and logs them', async () => {
      job.shouldThrow = true;

      job.start();
      await vi.advanceTimersByTimeAsync(1000);

      expect(logger.error).toHaveBeenCalledWith('Job test-job failed', {
        error: 'Test job failure',
      });
    });

    it('continues running after an error', async () => {
      job.shouldThrow = true;

      job.start();
      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(1);

      // The job should still fire again
      job.shouldThrow = false;
      await vi.advanceTimersByTimeAsync(1000);
      expect(job.runCount).toBe(2);
    });
  });
});
