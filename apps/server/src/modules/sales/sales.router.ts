// sales.router.ts
import { Router } from 'express';
import { SalesController } from './sales.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createSaleSchema, getSalesQuerySchema } from './sales.schema';

export const salesRouter = Router();

salesRouter.use(requireAuth, requireBusinessAccess());
salesRouter.post('/', validateRequest(createSaleSchema), SalesController.create);
salesRouter.get('/', validateRequest(getSalesQuerySchema), SalesController.list);