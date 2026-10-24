import { MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error.middleware';

export class InventoryService {
  static async recordMovement(
    businessId: string,
    data: {
      productId: string;
      type: MovementType;
      quantity: number;
      reason?: string;
      batchNumber?: string;
      expirationDate?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Get product & verify business ownership
      const product = await tx.product.findFirst({
        where: { id: data.productId, businessId },
      });

      if (!product) {
        throw new AppError(404, 'Product not found in this business workspace');
      }

      let newStock = product.currentStock;
      let batchId: string | undefined;

      // 2. Process Batch if provided
      if (data.batchNumber && (data.type === 'RECEIVING' || data.type === 'RETURN')) {
        const batch = await tx.stockBatch.create({
          data: {
            productId: product.id,
            batchNumber: data.batchNumber,
            quantity: data.quantity,
            expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
          },
        });
        batchId = batch.id;
      }

      // 3. Calculate new stock based on operation type
      if (data.type === 'RECEIVING' || data.type === 'RETURN') {
        newStock += data.quantity;
      } else if (data.type === 'DEDUCTION') {
        if (product.currentStock < data.quantity) {
          throw new AppError(
            400,
            `Insufficient stock. Available: ${product.currentStock}, Requested: ${data.quantity}`
          );
        }
        newStock -= data.quantity;
      } else if (data.type === 'ADJUSTMENT') {
        // Manual adjustment sets the absolute current stock level
        newStock = data.quantity;
      }

      // 4. Update Product Stock
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      // 5. Create Movement Audit Trail Record
      const movement = await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: product.id,
          batchId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason || `Stock ${data.type.toLowerCase()} operation`,
        },
      });

      return { movement, updatedStock: newStock };
    });
  }

  static async getMovementHistory(businessId: string, productId?: string) {
    return prisma.inventoryMovement.findMany({
      where: {
        businessId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { name: true, sku: true } },
        batch: { select: { batchNumber: true, expirationDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}