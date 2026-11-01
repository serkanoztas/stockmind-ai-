import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid product ID'),
          quantity: z.number().int().positive('Quantity must be greater than 0'),
          unitPrice: z.number().positive('Unit price must be greater than 0').optional(),
          batchId: z.string().uuid().optional(),
        })
      )
      .min(1, 'At least one sale item is required'),
  }),
});

export const getSalesQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  }),
});