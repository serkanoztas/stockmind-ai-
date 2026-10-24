// product.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as any;
      const result = await ProductService.getProducts(req.businessId!, {
        search: query.search,
        categoryId: query.categoryId,
        lowStock: query.lowStock,
        page: query.page,
        limit: query.limit,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductById(req.businessId!, req.params.id);
      res.status(200).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.businessId!, req.body);
      res.status(201).json({ data: product });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.updateProduct(req.businessId!, req.params.id, req.body);
      res.status(200).json({ data: product });
    } catch (err) {
      next(err);
    }
  }
}