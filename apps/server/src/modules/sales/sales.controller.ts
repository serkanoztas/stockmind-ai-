// sales.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service';

export class SalesController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await SalesService.createSale(req.businessId!, req.body.items);
      res.status(201).json({ data: sale });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as any;
      const result = await SalesService.getSalesHistory(req.businessId!, {
        startDate: query.startDate,
        endDate: query.endDate,
        page: query.page,
        limit: query.limit,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}