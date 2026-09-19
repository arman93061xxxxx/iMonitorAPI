import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as controller from './history.controller';
import { incidentIdParamsSchema, incidentsSchema, monitoringLogsSchema } from './history.validation';

const router = Router();
router.use(authenticate);

router.get('/analytics/summary', asyncHandler(controller.analyticsSummary));
router.get('/incidents', validate(incidentsSchema), asyncHandler(controller.incidents));
router.get('/incidents/:id', validate(incidentIdParamsSchema), asyncHandler(controller.incidentDetail));
router.get('/incidents/:id/analysis', validate(incidentIdParamsSchema), asyncHandler(controller.analysis));
router.get('/incidents/:id/alerts', validate(incidentIdParamsSchema), asyncHandler(controller.alerts));
router.get('/apis/:id/monitoring-logs', validate(monitoringLogsSchema), asyncHandler(controller.monitoringLogs));

export default router;
