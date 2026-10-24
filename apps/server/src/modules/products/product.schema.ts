import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name required'),
    sku: z.string().min(2, 'SKU required'),
    barcode: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    purchasePrice: z.number().positive('Purchase price must be greater than 0'),
    sellingPrice: z.number().positive('Selling price must be greater than 0'),
    minStockThreshold: z.number().int().min(0).default(5),
    initialStock: z.number().int().min(0).default(0),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: createProductSchema.shape.body.partial().omit({ initialStock: true }),
});

export const getProductsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    lowStock: z.enum(['true', 'false']).optional(),
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  }),
});