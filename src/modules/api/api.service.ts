import prisma from '../../config/database';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { ERROR_CODES } from '../../utils/constants';

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
