import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { validate } from '../../middleware/validation.middleware';
import { apiIdParamsSchema, createApiSchema, updateApiSchema, listApisSchema, testApiSchema } from './api.validation';
import * as apiController from './api.controller';

const router = Router();

router.use(authenticate);

router.post('/test', validate(testApiSchema), asyncHandler(apiController.testConnection));
router.post('/', validate(createApiSchema), asyncHandler(apiController.create));
router.get('/', validate(listApisSchema), asyncHandler(apiController.list));
router.get('/:id', validate(apiIdParamsSchema), asyncHandler(apiController.getById));
router.patch('/:id', validate(updateApiSchema), asyncHandler(apiController.update));
router.delete('/:id', validate(apiIdParamsSchema), asyncHandler(apiController.remove));
router.post('/:id/enable', validate(apiIdParamsSchema), asyncHandler(apiController.enable));
router.post('/:id/disable', validate(apiIdParamsSchema), asyncHandler(apiController.disable));
router.post('/:id/check', validate(apiIdParamsSchema), asyncHandler(apiController.checkNow));

export default router;
