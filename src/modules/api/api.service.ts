import axios from 'axios';
import prisma from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { ERROR_CODES } from '../../utils/constants';
import { performCheck } from '../monitoring/monitoring.service';
import { processCheckResult } from '../incidents';
import { logger } from '../../utils/logger';

interface CreateApiInput {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  description?: string;
  monitoringInterval?: number;
  timeout?: number;
  expectedStatusCode?: number;
  isActive?: boolean;
}

const assertOwned = async (apiId: string, userId: string) => {
  const api = await prisma.api.findUnique({ where: { id: apiId } });
  if (!api) {
    throw new NotFoundError('The requested API does not exist.', ERROR_CODES.API_NOT_FOUND);
  }
  if (api.userId !== userId) {
    throw new NotFoundError('The requested API does not exist.', ERROR_CODES.API_NOT_FOUND);
  }
  return api;
};

export const createApi = (userId: string, input: CreateApiInput) => {
  return prisma.api.create({
    data: {
      name: input.name,
      url: input.url,
      method: input.method ?? 'GET',
      description: input.description,
      monitoringInterval: input.monitoringInterval,
      timeout: input.timeout,
      expectedStatusCode: input.expectedStatusCode,
      isActive: input.isActive ?? true,
      userId,
    },
  });
};

export const listApis = (userId: string, limit?: number, offset?: number) => {
  return prisma.api.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
};

export const getApiById = async (userId: string, apiId: string) => {
  return assertOwned(apiId, userId);
};

export const updateApi = async (userId: string, apiId: string, input: Partial<CreateApiInput>) => {
  await assertOwned(apiId, userId);
  const { userId: _userId, ...safeInput } = input as { userId?: string };
  return prisma.api.update({
    where: { id: apiId },
    data: safeInput,
  });
};

export const deleteApi = async (userId: string, apiId: string) => {
  await assertOwned(apiId, userId);
  await prisma.api.delete({ where: { id: apiId } });
};

export const setApiActive = async (userId: string, apiId: string, isActive: boolean) => {
  await assertOwned(apiId, userId);
  return prisma.api.update({
    where: { id: apiId },
    data: { isActive },
  });
};

interface TestApiInput {
  url: string;
  method?: string;
  timeout?: number;
  expectedStatusCode?: number;
}

export const testConnection = async (input: TestApiInput) => {
  const startTime = Date.now();
  const method = input.method ?? 'GET';
  const timeoutMs = input.timeout ?? 5000;
  const expectedStatus = input.expectedStatusCode ?? 200;

  try {
    const response = await axios.request({
      method,
      url: input.url,
      timeout: timeoutMs,
      validateStatus: null,
      maxRedirects: 5,
    });

    const responseTime = Date.now() - startTime;
    const isAvailable = response.status === expectedStatus;

    return {
      statusCode: response.status,
      responseTime,
      isAvailable,
      expectedStatusCode: expectedStatus,
      statusText: response.statusText,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      statusCode: null,
      responseTime,
      isAvailable: false,
      expectedStatusCode: expectedStatus,
      errorMessage: error.message || 'Connection failed',
    };
  }
};

export const triggerCheck = async (userId: string, apiId: string) => {
  const api = await assertOwned(apiId, userId);
  const result = await performCheck(api);
  if (result.logId) {
    try {
      await processCheckResult(api.id, result, result.logId);
    } catch (error) {
      logger.error('Incident processing failed on manual check', { apiId: api.id, error });
    }
  }
  return result;
};
