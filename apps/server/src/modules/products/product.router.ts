// product.router.ts
import { Router } from 'express';
import { ProductController } from './product.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createProductSchema, updateProductSchema, getProductsQuerySchema } from './product.schema';

export const productRouter = Router();

productRouter.use(requireAuth, requireBusinessAccess());
productRouter.get('/', validateRequest(getProductsQuerySchema), ProductController.list);
productRouter.get('/:id', ProductController.getById);
productRouter.post('/', validateRequest(createProductSchema), ProductController.create);
productRouter.patch('/:id', validateRequest(updateProductSchema), ProductController.update);