// analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AnalyticsService.getInventorySummary(req.businessId!);
      res.status(200).json({ data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async getRisks(req: Request, res: Response, next: NextFunction) {
    try {
      const risks = await AnalyticsService.getStockoutRisks(req.businessId!);
      res.status(200).json({ data: risks });
    } catch (err) {
      next(err);
    }
  }

  static async getReorders(req: Request, res: Response, next: NextFunction) {
    try {
      const reorders = await AnalyticsService.getReorderRecommendations(req.businessId!);
      res.status(200).json({ data: reorders });
    } catch (err) {
      next(err);
    }
  }

  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const salesAnalytics = await AnalyticsService.getSalesAnalytics(req.businessId!);
      res.status(200).json({ data: salesAnalytics });
    } catch (err) {
      next(err);
    }
  }
}

