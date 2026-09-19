import { z } from 'zod';
import { INCIDENT_STATUS } from '../../utils/constants';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const apiIdSchema = z.object({
  id: z.string().uuid(),
});

const incidentIdSchema = z.object({
  id: z.string().cuid(),
});

export const monitoringLogsSchema = z.object({
  params: apiIdSchema,
  query: paginationSchema,
});

export const incidentsSchema = z.object({
  query: paginationSchema.extend({
    status: z.enum([INCIDENT_STATUS.OPEN, INCIDENT_STATUS.INVESTIGATING, INCIDENT_STATUS.RESOLVED]).optional(),
    apiId: z.string().uuid().optional(),
  }),
});

export const incidentIdParamsSchema = z.object({ params: incidentIdSchema });
