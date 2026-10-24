import { z } from 'zod';

export const createMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    type: z.enum(['RECEIVING', 'DEDUCTION', 'ADJUSTMENT', 'RETURN']),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
    reason: z.string().optional(),
    batchNumber: z.string().optional(),
    expirationDate: z.string().datetime().optional(),
  }),
});