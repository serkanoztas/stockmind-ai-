// category.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getCategories(req.businessId!);
      res.status(200).json({ data: categories });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.createCategory(req.businessId!, req.body.name);
      res.status(201).json({ data: category });
    } catch (err) {
      next(err);
    }
  }
}

