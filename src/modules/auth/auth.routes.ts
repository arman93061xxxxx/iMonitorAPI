import { Router } from 'express';
import { asyncHandler } from '../../middleware/async-handler.middleware';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { loginSchema, registerSchema } from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.me));

export default router;
