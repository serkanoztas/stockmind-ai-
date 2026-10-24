// inventory.controller.ts
import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';

export class InventoryController {
  static async createMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.recordMovement(req.businessId!, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.query.productId as string | undefined;
      const history = await InventoryService.getMovementHistory(req.businessId!, productId);
      res.status(200).json({ data: history });
    } catch (err) {
      next(err);
    }
  }
}