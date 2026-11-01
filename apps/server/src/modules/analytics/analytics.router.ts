// analytics.router.ts
import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireBusinessAccess());
analyticsRouter.get('/summary', AnalyticsController.getSummary);
analyticsRouter.get('/risks', AnalyticsController.getRisks);
analyticsRouter.get('/reorders', AnalyticsController.getReorders);
analyticsRouter.get('/sales', AnalyticsController.getSales);