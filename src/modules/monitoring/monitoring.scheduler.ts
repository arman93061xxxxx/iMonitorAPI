import cron from 'node-cron';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import { performCheck } from './monitoring.service';
import { processCheckResult } from '../incidents';
import type { ScheduledTask } from 'node-cron';

const inProgress = new Set<string>();
let schedulerTask: ScheduledTask | null = null;

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let active = 0;
  let resolveAll: () => void;
  const allPromise = new Promise<void>((resolve) => { resolveAll = resolve; });

  const runNext = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      results[i] = await worker(item);
    }
    active--;
    if (active === 0) resolveAll();
  };

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    active++;
    runNext().catch((error) => {
      logger.error('Concurrency worker error', { error });
    });
  }

  await allPromise;
  return results;
}

const getLatestCheckTimestamp = async (apiId: string): Promise<Date | null> => {
  const latestLog = await prisma.monitoringLog.findFirst({
    where: { apiId },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });
  return latestLog?.timestamp ?? null;
};

const isApiDue = async (api: { id: string; monitoringInterval: number }): Promise<boolean> => {
  const latestTimestamp = await getLatestCheckTimestamp(api.id);
  if (!latestTimestamp) return true;

  const nextCheck = new Date(latestTimestamp.getTime() + api.monitoringInterval * 1000);
  return nextCheck <= new Date();
};

const runMonitoringCycle = async (): Promise<void> => {
  try {
    const apis = await prisma.api.findMany({
      where: { isActive: true },
      select: { id: true, monitoringInterval: true },
    });

    const dueApis = await Promise.all(
      apis.map(async (api) => ({
        api,
        due: await isApiDue(api),
      }))
    );

    const toCheck = dueApis.filter((item) => item.due && !inProgress.has(item.api.id));

    if (toCheck.length === 0) return;

    logger.info(`Starting monitoring cycle for ${toCheck.length} APIs`);

    await runWithConcurrency(
      toCheck,
      config.monitoring.concurrencyLimit,
      async ({ api }) => {
        inProgress.add(api.id);
        try {
          const fullApi = await prisma.api.findUnique({
            where: { id: api.id },
          });

          if (!fullApi) return;

          const result = await performCheck(fullApi);
          logger.info('Monitoring check completed', {
            apiId: fullApi.id,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            isAvailable: result.isAvailable,
          });

          if (result.logId) {
            try {
              await processCheckResult(fullApi.id, result, result.logId);
            } catch (error) {
              logger.error('Incident processing failed', { apiId: fullApi.id, error });
            }
          }
        } catch (error) {
          logger.error('Monitoring check failed', { apiId: api.id, error });
        } finally {
          inProgress.delete(api.id);
        }
      }
    );
  } catch (error) {
    logger.error('Monitoring cycle failed', { error });
  }
};

export const startScheduler = (): void => {
  if (schedulerTask) {
    logger.warn('Monitoring scheduler already running');
    return;
  }

  schedulerTask = cron.schedule(
    '*/10 * * * * *',
    () => {
      runMonitoringCycle();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('Monitoring scheduler started (10s tick)');
};

export const stopScheduler = (): void => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Monitoring scheduler stopped');
  }
};
