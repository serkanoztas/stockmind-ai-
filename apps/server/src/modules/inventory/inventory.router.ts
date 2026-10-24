// inventory.router.ts
import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { requireAuth, requireBusinessAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createMovementSchema } from './inventory.schema';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireBusinessAccess());
inventoryRouter.get('/history', InventoryController.getHistory);
inventoryRouter.post('/movements', validateRequest(createMovementSchema), InventoryController.createMovement);