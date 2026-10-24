// category.router.ts
import { Router } from 'express';
import { CategoryController } from './category.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createCategorySchema } from './category.schema';

export const categoryRouter = Router();

categoryRouter.use(requireAuth, requireBusinessAccess());
categoryRouter.get('/', CategoryController.list);
categoryRouter.post('/', validateRequest(createCategorySchema), CategoryController.create);