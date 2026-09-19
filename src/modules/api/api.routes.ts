import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { validate } from '../../middleware/validation.middleware';
import { apiIdParamsSchema, createApiSchema, updateApiSchema, listApisSchema } from './api.validation';
import * as apiController from './api.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createApiSchema), asyncHandler(apiController.create));
router.get('/', validate(listApisSchema), asyncHandler(apiController.list));
router.get('/:id', validate(apiIdParamsSchema), asyncHandler(apiController.getById));
router.patch('/:id', validate(updateApiSchema), asyncHandler(apiController.update));
router.delete('/:id', validate(apiIdParamsSchema), asyncHandler(apiController.remove));
router.post('/:id/enable', validate(apiIdParamsSchema), asyncHandler(apiController.enable));
router.post('/:id/disable', validate(apiIdParamsSchema), asyncHandler(apiController.disable));

export default router;
