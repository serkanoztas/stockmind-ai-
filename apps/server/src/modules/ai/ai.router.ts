// ai.router.ts
import { Router } from 'express';
import { AiController } from './ai.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { aiAskSchema } from './ai.schema';

export const aiRouter = Router();

aiRouter.use(requireAuth, requireBusinessAccess());
aiRouter.post('/assistant', validateRequest(aiAskSchema), AiController.ask);