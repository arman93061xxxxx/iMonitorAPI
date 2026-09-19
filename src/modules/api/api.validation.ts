import { z } from 'zod';
import { HTTP_METHODS, VALIDATION_RULES } from '../../utils/constants';

const httpMethodSchema = z.enum([
  HTTP_METHODS.GET,
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.DELETE,
  HTTP_METHODS.HEAD,
  HTTP_METHODS.OPTIONS,
]);

const urlSchema = z
  .string()
  .trim()
  .url('Invalid URL')
  .refine(value => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

export const createApiSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(VALIDATION_RULES.API.NAME_MAX_LENGTH),
    url: urlSchema,
    method: httpMethodSchema.optional().default(HTTP_METHODS.GET),
    description: z.string().trim().max(VALIDATION_RULES.API.DESCRIPTION_MAX_LENGTH).optional(),
    monitoringInterval: z
      .number()
      .int()
      .min(VALIDATION_RULES.API.MIN_INTERVAL)
      .max(VALIDATION_RULES.API.MAX_INTERVAL)
      .optional(),
    timeout: z
      .number()
      .int()
      .min(VALIDATION_RULES.API.MIN_TIMEOUT)
      .max(VALIDATION_RULES.API.MAX_TIMEOUT)
      .optional(),
    expectedStatusCode: z.number().int().min(100).max(599).optional(),
    isActive: z.boolean().optional(),
  }).refine(
    (data) => {
      if (data.monitoringInterval != null && data.timeout != null) {
        return data.timeout <= data.monitoringInterval * 1000;
      }
      return true;
    },
    {
      message: 'Timeout must be less than or equal to monitoring interval',
      path: ['timeout'],
    }
  ),
});

export const updateApiSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(VALIDATION_RULES.API.NAME_MAX_LENGTH).optional(),
    url: urlSchema.optional(),
    method: httpMethodSchema.optional(),
    description: z.string().trim().max(VALIDATION_RULES.API.DESCRIPTION_MAX_LENGTH).nullable().optional(),
    monitoringInterval: z
      .number()
      .int()
      .min(VALIDATION_RULES.API.MIN_INTERVAL)
      .max(VALIDATION_RULES.API.MAX_INTERVAL)
      .optional(),
    timeout: z
      .number()
      .int()
      .min(VALIDATION_RULES.API.MIN_TIMEOUT)
      .max(VALIDATION_RULES.API.MAX_TIMEOUT)
      .optional(),
    expectedStatusCode: z.number().int().min(100).max(599).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const apiIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listApisSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }),
});
