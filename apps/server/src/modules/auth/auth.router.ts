import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';
import { requireAuth } from '../../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', validateRequest(registerSchema), AuthController.register);
authRouter.post('/login', validateRequest(loginSchema), AuthController.login);
authRouter.get('/me', requireAuth, AuthController.me);