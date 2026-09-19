import axios, { AxiosError } from 'axios';
import prisma from '../../config/database';
import { getRedisClient } from '../../config/redis';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { REDIS_KEYS } from '../../utils/constants';
import type { Api } from '@prisma/client';

export interface CheckResult {
  apiId: string;
  statusCode: number | null;
  responseTime: number | null;
  isAvailable: boolean;
  isTimeout: boolean;
  errorMessage: string | null;
  logId?: string;
}

export const performCheck = async (api: Api): Promise<CheckResult> => {
  const startTime = Date.now();
  const timeoutMs = api.timeout ?? config.monitoring.defaultTimeout;

  try {
    const response = await axios.request({
      method: api.method,
      url: api.url,
      timeout: timeoutMs,
      validateStatus: null,
      maxRedirects: 5,
    });

    const responseTime = Date.now() - startTime;
    const isAvailable = response.status === api.expectedStatusCode;

    const result: CheckResult = {
      apiId: api.id,
      statusCode: response.status,
      responseTime,
      isAvailable,
      isTimeout: false,
      errorMessage: isAvailable ? null : `Expected ${api.expectedStatusCode}, got ${response.status}`,
    };

    result.logId = await persistResult(api.id, result);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    let isTimeout = false;
    let errorMessage: string | null = null;
    let statusCode: number | null = null;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      isTimeout = true;
      errorMessage = 'Request timed out';
    } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
      errorMessage = axiosError.message || 'Network error';
    } else if (axiosError.response) {
      statusCode = axiosError.response.status;
      errorMessage = axiosError.response.statusText || axiosError.message;
    } else if (axiosError.request) {
      errorMessage = 'No response received';
    } else {
      errorMessage = axiosError.message || 'Request failed';
    }

    const result: CheckResult = {
      apiId: api.id,
      statusCode,
      responseTime,
      isAvailable: false,
      isTimeout,
      errorMessage,
    };

    result.logId = await persistResult(api.id, result);
    return result;
  }
};

const persistResult = async (apiId: string, result: CheckResult): Promise<string | undefined> => {
  let logId: string | undefined;
  try {
    const log = await prisma.monitoringLog.create({
      data: {
        apiId,
        timestamp: new Date(),
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        isAvailable: result.isAvailable,
        errorMessage: result.errorMessage,
        isTimeout: result.isTimeout,
      },
    });
    logId = log.id;
  } catch (error) {
    logger.error('Failed to persist monitoring log', { apiId, error });
  }

  try {
    await updateRedisStatus(apiId, result);
  } catch (error) {
    logger.warn('Failed to update Redis status', { apiId, error });
  }

  return logId;
};

const updateRedisStatus = async (apiId: string, result: CheckResult): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis not available, skipping status update', { apiId });
      return;
    }

    const status = result.isAvailable ? 'UP' : result.isTimeout ? 'TIMEOUT' : 'DOWN';

    const snapshot = {
      status,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      checkedAt: new Date().toISOString(),
      isAvailable: result.isAvailable,
      errorMessage: result.errorMessage,
    };

    const key = REDIS_KEYS.API_STATUS(apiId);
    await redis.setex(key, config.redis.ttl.apiStatus, JSON.stringify(snapshot));
  } catch (error) {
    logger.warn('Failed to update Redis status', { apiId, error });
  }
};
